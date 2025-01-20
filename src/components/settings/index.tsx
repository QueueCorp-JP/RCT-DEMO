import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { GitHubLink } from '../githubLink'
import { IconButton } from '../iconButton'
import Based from './based'
import AI from './ai'
import Voice from './voice'
import Other from './other'
import { PdfUploader } from '../pdfUploader'
import { PDFHistory } from './pdfHistory'
import ChatHistory from './chatHistory'

type Props = {
  onClickClose: () => void
}
const Settings = (props: Props) => {
  return (
    <div className="absolute z-40 w-full h-full bg-white/80 backdrop-blur ">
      <Header {...props} />
      <Main />
      <Footer />
    </div>
  )
}
export default Settings

const Header = ({ onClickClose }: Pick<Props, 'onClickClose'>) => {
  return (
    <>
      <GitHubLink />
      <div className="absolute m-24">
        <IconButton
          iconName="24/Close"
          isProcessing={false}
          onClick={onClickClose}
        ></IconButton>
      </div>
    </>
  )
}

// タブの定義
type TabKey = 'general' | 'ai' | 'voice' | 'other' | 'pdf' | 'chat-history'

const Main = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>('general')

  const tabs: { key: TabKey; label: string }[] = [
    {
      key: 'general',
      label: t('Settings'),
    },
    {
      key: 'pdf',
      label: '■ 製品資料',
    },
    {
      key: 'ai',
      label: t('AISettings'),
    },
    {
      key: 'voice',
      label: t('VoiceSettings'),
    },
    {
      key: 'other',
      label: t('OtherSettings'),
    },
    {
      key: 'chat-history',
      label: `■ ${t('QuestionLog')}`,
    },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <Based />
      case 'pdf':
        return (
          <div className="bg-white/5 p-6 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <div className="bg-blue-500/10 p-2 rounded-xl mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">製品資料の設定</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="bg-blue-500/10 p-1.5 rounded-lg flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    製品資料（PDF）をアップロードすると、AIがその内容を参考に製品説明を行います。
                    新しい資料をアップロードすると、以前の内容は上書きされます。
                  </p>
                </div>
                <PdfUploader />
                <PDFHistory />
              </div>
            </div>
          </div>
        )
      case 'ai':
        return <AI />
      case 'voice':
        return <Voice />
      case 'other':
        return <Other />
      case 'chat-history':
        return (
          <div className="bg-white/5 p-6 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <div className="bg-blue-500/10 p-2 rounded-xl mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 font-noto-sans-jp tracking-wider leading-relaxed">{t('QuestionLogHistory')}</h2>
            </div>
            <div className="bg-gray-900/80 rounded-lg">
              <ChatHistory />
            </div>
          </div>
        )
    }
  }

  return (
    <main className="max-h-full overflow-auto">
      <div className="text-text1 max-w-5xl mx-auto px-24 py-64">
        <div className="md:flex mt-16">
          {/* タブナビゲーション */}
          <ul className="flex flex-col space-y-4 text-sm font-medium md:w-[25%] md:me-8 mb-16 md:mb-0">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <button
                  className={`flex py-8 px-16 rounded-8 w-full typography-16 text-left
                    ${
                      activeTab === tab.key
                        ? 'text-white bg-primary'
                        : 'bg-gray-50 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>

          {/* タブコンテンツ */}
          <div className="p-24 bg-surface7-hover text-medium rounded-8 w-full">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </main>
  )
}

const Footer = () => {
  return (
    <footer className="absolute py-4 bg-[#413D43] text-center text-white font-Montserrat bottom-0 w-full">
    </footer>
  )
}
