import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { EMOTIONS } from '@/features/messages/messages'

import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'
import { messageSelectors } from '@/features/messages/messageSelectors'

export const ChatLog = () => {
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const characterName = settingsStore((s) => s.characterName)
  const messages = messageSelectors.getTextAndImageMessages(
    homeStore((s) => s.chatLog)
  )

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({
      behavior: 'auto',
      block: 'center',
    })
  }, [])

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [messages])

  return (
    <div className="absolute w-col-span-7 max-w-full h-[100svh] pb-64 z-10">
      <div className="max-h-full px-16 pt-104 pb-64 overflow-y-auto scroll-hidden">
        {messages.map((msg, i) => {
          return (
            <div key={i} ref={messages.length - 1 === i ? chatScrollRef : null}>
              {(() => {
                if (typeof msg.content === 'string') {
                  return (
                    <Chat
                      role={msg.role}
                      message={msg.content}
                      characterName={characterName}
                    />
                  );
                }

                if (msg.content && Array.isArray(msg.content)) {
                  const textContent = msg.content.find(item => item.type === 'text')?.text || '';
                  const imageContent = msg.content.find(item => item.type === 'image')?.image;

                  return (
                    <div className={`mx-auto max-w-[32rem] my-16 ${msg.role === 'user' ? 'pl-40' : 'pr-40'}`}>
                      <div className={`px-24 py-8 rounded-t-8 font-bold tracking-wider ${msg.role !== 'user' ? 'bg-secondary text-white' : 'bg-base text-primary'}`}>
                        {msg.role !== 'user' ? (
                          <div className="flex items-center">
                            <img src="/images/rct-japan-logo.svg" alt="RCT JAPAN" className="h-6 w-auto mr-2" />
                            <span>{characterName || 'CHARACTER'}</span>
                          </div>
                        ) : 'YOU'}
                      </div>
                      <div className="bg-white rounded-b-8">
                        {textContent && (
                          <div className="px-24 py-16">
                            <div className={`typography-16 font-bold ${msg.role !== 'user' ? 'text-secondary' : 'text-primary'}`}>
                              {textContent.split('\n').map((line, index) => {
                                // 箇条書きの行を検出
                                const isList = line.trim().startsWith('・');
                                // 空行を検出
                                const isEmpty = line.trim() === '';
                                
                                return (
                                  <div 
                                    key={index}
                                    className={`
                                      ${isEmpty ? 'h-4' : ''}
                                      ${isList ? 'pl-4' : ''}
                                      ${index > 0 ? 'mt-2' : ''}
                                    `}
                                  >
                                    {line}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {imageContent && (
                          <div className="px-4 pt-4 pb-4">
                            <div className="relative w-full h-[300px]">
                              <Image
                                src={imageContent}
                                alt="Product Image"
                                className="rounded-lg"
                                layout="fill"
                                objectFit="contain"
                                unoptimized
                                priority
                                onError={(e: any) => {
                                  console.error('Image load error:', e);
                                  console.error('Failed to load image:', imageContent);
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const Chat = ({
  role,
  message,
  characterName,
}: {
  role: string
  message: string
  characterName: string
}) => {
  // アスタリスクを含まない形式に変換
  const emotionPattern = new RegExp(`\\[(${EMOTIONS.join('|')})\\]\\s*`, 'g')
  const processedMessage = message.replace(emotionPattern, '')

  const roleColor =
    role !== 'user' ? 'bg-secondary text-white ' : 'bg-base text-primary'
  const roleText = role !== 'user' ? 'text-secondary' : 'text-primary'
  const offsetX = role === 'user' ? 'pl-40' : 'pr-40'

  return (
    <div className={`mx-auto max-w-[32rem] my-16 ${offsetX}`}>
      {role === 'code' ? (
        <pre className="whitespace-pre-wrap break-words bg-[#1F2937] text-white p-16 rounded-8">
          <code className="font-mono text-sm">{message}</code>
        </pre>
      ) : (
        <>
          <div
            className={`px-24 py-8 rounded-t-8 font-bold tracking-wider ${roleColor}`}
          >
            {role !== 'user' ? (
              <div className="flex items-center">
                <img src="/images/rct-japan-logo.svg" alt="RCT JAPAN" className="h-6 w-auto mr-2" />
                <span>{characterName || 'CHARACTER'}</span>
              </div>
            ) : 'YOU'}
          </div>
          <div className="px-24 py-16 bg-white rounded-b-8">
            <div className={`typography-16 font-bold ${roleText}`}>
              {processedMessage.split('\n').map((line, index) => {
                // 箇条書きの行を検出
                const isList = line.trim().startsWith('・');
                // 空行を検出
                const isEmpty = line.trim() === '';
                
                return (
                  <div 
                    key={index}
                    className={`
                      ${isEmpty ? 'h-4' : ''}
                      ${isList ? 'pl-4' : ''}
                      ${index > 0 ? 'mt-2' : ''}
                    `}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
