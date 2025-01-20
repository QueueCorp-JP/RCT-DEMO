import { useEffect, useRef } from 'react'
import { Message } from '@/features/messages/messages'
import Image from 'next/image'

interface Props {
  messages: Message[]
  characterName?: string
}

interface ChatProps {
  role: string
  message: string
  characterName?: string
}

type MessageItem = {
  type: 'text'
  text: string
} | {
  type: 'image'
  image: string
}

const Chat = ({ role, message, characterName }: ChatProps) => {
  return (
    <div
      className={`mx-auto max-w-[32rem] my-16 ${
        role === 'user' ? 'pl-40' : 'pr-40'
      }`}
    >
      <div
        className={`px-24 py-8 rounded-t-8 font-bold tracking-wider ${
          role !== 'user'
            ? 'bg-secondary text-white'
            : 'bg-base text-primary'
        }`}
      >
        {role !== 'user' ? (
          <div className="flex items-center">
            <Image
              src="/images/rct-japan-logo.svg"
              alt="RCT JAPAN"
              width={24}
              height={24}
              className="mr-2"
            />
            <span>{characterName || 'CHARACTER'}</span>
          </div>
        ) : (
          'YOU'
        )}
      </div>
      <div className="bg-white rounded-b-8">
        <div className="px-24 py-16">
          <div
            className={`typography-16 font-bold ${
              role !== 'user' ? 'text-secondary' : 'text-primary'
            }`}
          >
            {message.split('\n').map((line: string, index: number) => {
              const isList = line.trim().startsWith('・')
              const isEmpty = line.trim() === ''

              return (
                <div
                  key={index}
                  className={`${isList ? 'ml-16' : ''} ${
                    isEmpty ? 'h-16' : ''
                  }`}
                >
                  {line}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

const ChatLog = ({ messages, characterName }: Props) => {
  const chatScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
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
                  )
                }

                if (msg.content && Array.isArray(msg.content)) {
                  const content = msg.content as MessageItem[]
                  const textContent = content.find(
                    (item): item is { type: 'text'; text: string } =>
                      item.type === 'text'
                  )?.text || ''

                  const imageContent = content.find(
                    (item): item is { type: 'image'; image: string } =>
                      item.type === 'image'
                  )?.image

                  return (
                    <div
                      className={`mx-auto max-w-[32rem] my-16 ${
                        msg.role === 'user' ? 'pl-40' : 'pr-40'
                      }`}
                    >
                      <div
                        className={`px-24 py-8 rounded-t-8 font-bold tracking-wider ${
                          msg.role !== 'user'
                            ? 'bg-secondary text-white'
                            : 'bg-base text-primary'
                        }`}
                      >
                        {msg.role !== 'user' ? (
                          <div className="flex items-center">
                            <Image
                              src="/images/rct-japan-logo.svg"
                              alt="RCT JAPAN"
                              width={24}
                              height={24}
                              className="mr-2"
                            />
                            <span>{characterName || 'CHARACTER'}</span>
                          </div>
                        ) : (
                          'YOU'
                        )}
                      </div>
                      <div className="bg-white rounded-b-8">
                        {textContent && (
                          <div className="px-24 py-16">
                            <div
                              className={`typography-16 font-bold ${
                                msg.role !== 'user'
                                  ? 'text-secondary'
                                  : 'text-primary'
                              }`}
                            >
                              {textContent.split('\n').map((line: string, index: number) => {
                                const isList = line.trim().startsWith('・')
                                const isEmpty = line.trim() === ''

                                return (
                                  <div
                                    key={index}
                                    className={`${isList ? 'ml-16' : ''} ${
                                      isEmpty ? 'h-16' : ''
                                    }`}
                                  >
                                    {line}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        {imageContent && (
                          <div className="px-24 py-16">
                            <Image
                              src={imageContent}
                              alt="Generated Image"
                              width={512}
                              height={512}
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ChatLog
