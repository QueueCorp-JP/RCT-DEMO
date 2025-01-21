import { Talk } from './messages';
import homeStore from '@/features/stores/home';
import settingsStore from '@/features/stores/settings';
import { Live2DHandler } from './live2dHandler';

type SpeakTask = {
  audioBuffer: ArrayBuffer;
  talk: Talk;
  isNeedDecode: boolean;
  onComplete?: () => void;
};

export class SpeakQueue {
  private static instance: SpeakQueue;
  private queue: SpeakTask[] = [];
  private isProcessing = false;
  private _forceStop = false;

  public static getInstance(): SpeakQueue {
    if (!SpeakQueue.instance) {
      SpeakQueue.instance = new SpeakQueue();
    }
    return SpeakQueue.instance;
  }

  public hasActiveTasks(): boolean {
    return this.queue.length > 0 || this.isProcessing;
  }

  async clearQueue() {
    try {
      // 強制停止フラグをセット
      this._forceStop = true;

      // 即座に状態をリセット
      homeStore.setState({
        chatProcessing: false,
        isSpeaking: false,
        stopSpeech: true,
        chatProcessingCount: 0,
        assistantMessage: ''
      });

      // キューを強制クリア
      this.queue = [];
      this.isProcessing = false;

      const hs = homeStore.getState();
      const ss = settingsStore.getState();

      // 音声を強制停止（複数回試行）
      const maxAttempts = 5;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          if (ss.modelType === 'live2d') {
            await Live2DHandler.resetToIdle();
          }
          
          if (hs.viewer.model) {
            // 音声を強制停止
            await hs.viewer.model.stopSpeaking();
            // 表情をリセット
            await hs.viewer.model.playEmotion('neutral');
            // AudioContextをリセット
            await hs.viewer.model.stopAudio();
            // 再度停止を確認
            await hs.viewer.model.stopSpeaking();
          }

          // 少し待機して確実に停止
          await new Promise(resolve => setTimeout(resolve, 100));

          // 停止確認
          if (!hs.viewer.model?.isPlaying()) {
            break;
          }
        } catch (e) {
          console.error(`Attempt ${i + 1} to stop audio failed:`, e);
          // 最後の試行でエラーの場合は投げる
          if (i === maxAttempts - 1) throw e;
          // エラー時は少し長めに待機
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // 最後にもう一度強制停止を試行
      if (hs.viewer.model) {
        await hs.viewer.model.stopSpeaking();
        await hs.viewer.model.stopAudio();
      }

      // 長めに待ってから強制停止フラグをリセット
      await new Promise(resolve => setTimeout(resolve, 300));
      this._forceStop = false;

      // 最終的な状態リセット
      homeStore.setState({
        chatProcessing: false,
        isSpeaking: false,
        stopSpeech: false,
        chatProcessingCount: 0,
        assistantMessage: ''
      });
    } catch (error) {
      console.error('Error clearing queue:', error);
      // エラー時も強制停止フラグをリセット
      this._forceStop = false;
      // エラー時も状態をリセット
      homeStore.setState({
        chatProcessing: false,
        isSpeaking: false,
        stopSpeech: false,
        chatProcessingCount: 0,
        assistantMessage: ''
      });
    }
  }

  async addTask(task: SpeakTask) {
    // 強制停止中は新しいタスクを受け付けない
    if (this._forceStop) {
      return;
    }

    this.queue.push(task);
    await this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this._forceStop) return;
    this.isProcessing = true;
    const hs = homeStore.getState();
    const ss = settingsStore.getState();

    try {
      while (this.queue.length > 0 && !this._forceStop) {
        const task = this.queue.shift();
        if (task) {
          try {
            const { audioBuffer, talk, isNeedDecode, onComplete } = task;
            if (ss.modelType === 'live2d') {
              await Live2DHandler.speak(audioBuffer, talk, isNeedDecode);
            } else {
              await hs.viewer.model?.speak(audioBuffer, talk, isNeedDecode);
            }
            if (!this._forceStop) {
              onComplete?.();
            }
          } catch (error) {
            console.error(
              'An error occurred while processing the speech synthesis task:',
              error
            );
            if (error instanceof Error) {
              console.error('Error details:', error.message);
            }
          }
        }

        // 強制停止フラグをチェック
        if (this._forceStop) {
          this.queue = [];
          break;
        }
      }
    } finally {
      this.isProcessing = false;
      // 強制停止フラグは clearQueue メソッドでのみリセットする
      if (!this._forceStop) {
        this.scheduleNeutralExpression();
      }
    }
  }

  private async scheduleNeutralExpression() {
    const initialLength = this.queue.length;
    await new Promise((resolve) =>
      setTimeout(resolve, SpeakQueue.QUEUE_CHECK_DELAY)
    );

    if (this.shouldResetToNeutral(initialLength)) {
      const hs = homeStore.getState();
      const ss = settingsStore.getState();
      if (ss.modelType === 'live2d') {
        await Live2DHandler.resetToIdle();
      } else {
        await hs.viewer.model?.playEmotion('neutral');
      }
    }
  }

  private shouldResetToNeutral(initialLength: number): boolean {
    return initialLength === 0 && this.queue.length === 0 && !this.isProcessing;
  }

  private static readonly QUEUE_CHECK_DELAY = 1500;
}
