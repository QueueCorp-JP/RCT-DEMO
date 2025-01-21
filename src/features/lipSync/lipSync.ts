import { LipSyncAnalyzeResult } from './lipSyncAnalyzeResult';

const TIME_DOMAIN_DATA_LENGTH = 2048;

export class LipSync {
  private _audio: AudioContext;
  private _analyser: AnalyserNode;
  private _timeDomainData: Float32Array;
  private _currentSource?: AudioBufferSourceNode;
  private _isPlaying: boolean = false;
  private _allNodes: AudioNode[] = [];

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  public constructor(initialAudio: AudioContext) {
    this._audio = initialAudio;
    this._analyser = this._audio.createAnalyser();
    this._timeDomainData = new Float32Array(TIME_DOMAIN_DATA_LENGTH);
  }

  public update(): LipSyncAnalyzeResult {
    if (!this._isPlaying) {
      return { volume: 0 };
    }

    this._analyser.getFloatTimeDomainData(this._timeDomainData);

    let volume = 0.0;
    for (let i = 0; i < TIME_DOMAIN_DATA_LENGTH; i++) {
      volume = Math.max(volume, Math.abs(this._timeDomainData[i]));
    }

    // cook
    volume = 1 / (1 + Math.exp(-45 * volume + 5));
    if (volume < 0.1) volume = 0;

    return {
      volume,
    };
  }

  private async forceStopAudio() {
    this._isPlaying = false;

    // すべてのノードを切断
    try {
      this._allNodes.forEach(node => {
        try {
          node.disconnect();
        } catch (e) {}
      });
      this._allNodes = [];
    } catch (e) {}

    // 現在の音声ソースを強制停止
    if (this._currentSource) {
      try {
        this._currentSource.stop(0);
      } catch (e) {}
      try {
        this._currentSource.disconnect();
      } catch (e) {}
      this._currentSource = undefined;
    }

    // アナライザーを切断
    try {
      this._analyser.disconnect();
    } catch (e) {}

    // AudioContextを強制終了して新しく作り直す
    try {
      if (this._audio && this._audio.state !== 'closed') {
        await this._audio.close();
      }
    } catch (e) {}

    try {
      this._audio = new AudioContext();
      this._analyser = this._audio.createAnalyser();
      await this._audio.resume();
    } catch (e) {}
  }

  public async stop() {
    // 複数回試行して確実に停止
    for (let i = 0; i < 3; i++) {
      try {
        await this.forceStopAudio();
        // 少し待機して確実に停止
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 停止確認
        if (!this._isPlaying && this._audio.state === 'running') {
          break;
        }
      } catch (e) {
        console.error(`Attempt ${i + 1} to stop audio failed:`, e);
      }
    }

    // 最後にもう一度強制停止
    await this.forceStopAudio();
    this._isPlaying = false;
  }

  public async playFromArrayBuffer(
    buffer: ArrayBuffer,
    onEnded?: () => void,
    isNeedDecode: boolean = true,
    sampleRate: number = 24000
  ) {
    try {
      // 既存の音声を強制停止
      await this.stop();

      // バッファの型チェック
      if (!(buffer instanceof ArrayBuffer)) {
        throw new Error('The input buffer is not in ArrayBuffer format');
      }

      // バッファの長さチェック
      if (buffer.byteLength === 0) {
        throw new Error('The input buffer is empty');
      }

      let audioBuffer: AudioBuffer;

      if (!isNeedDecode) {
        // PCM16形式の場合
        const pcmData = new Int16Array(buffer);
        const floatData = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          floatData[i] =
            pcmData[i] < 0 ? pcmData[i] / 32768.0 : pcmData[i] / 32767.0;
        }

        audioBuffer = this._audio.createBuffer(1, floatData.length, sampleRate);
        audioBuffer.getChannelData(0).set(floatData);
      } else {
        // 通常の圧縮音声ファイルの場合
        try {
          audioBuffer = await this._audio.decodeAudioData(buffer);
        } catch (decodeError) {
          console.error('Failed to decode audio data:', decodeError);
          throw new Error('The audio data could not be decoded');
        }
      }

      // 再生前に状態をチェック
      if (!this._isPlaying) {
        this._currentSource = this._audio.createBufferSource();
        this._currentSource.buffer = audioBuffer;

        this._currentSource.connect(this._audio.destination);
        this._currentSource.connect(this._analyser);

        // ノードを記録
        this._allNodes.push(this._currentSource);

        this._isPlaying = true;
        this._currentSource.start();

        if (onEnded) {
          this._currentSource.addEventListener('ended', () => {
            this._isPlaying = false;
            onEnded();
          });
        }
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
      this._isPlaying = false;
      if (onEnded) {
        onEnded();
      }
    }
  }

  public async playFromURL(url: string, onEnded?: () => void) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    await this.playFromArrayBuffer(buffer, onEnded);
  }
}
