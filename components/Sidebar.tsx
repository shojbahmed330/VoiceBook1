

import React from 'react';
import { User, AppView } from '../types';
import Icon from './Icon';

interface SidebarProps {
  currentUser: User;
  onNavigate: (viewName: 'feed' | 'friends' | 'settings' | 'profile' | 'messages' | 'sponsor_center') => void;
  onCreatePost: () => void;
  friendRequestCount: number;
  activeView: AppView;
  voiceCoins: number;
}

const NavItem: React.FC<{
    iconName: React.ComponentProps<typeof Icon>['name'];
    label: string;
    isActive: boolean;
    badgeCount?: number;
    onClick: () => void;
}> = ({ iconName, label, isActive, badgeCount = 0, onClick }) => {
    return (
        <li>
            <button
                onClick={onClick}
                className={`w-full flex items-center gap-4 p-3 rounded-lg text-lg transition-colors ${
                    isActive
                        ? 'bg-rose-500/10 text-rose-400 font-bold'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
                }`}
            >
                <Icon name={iconName} className="w-7 h-7" />
                <span>{label}</span>
                {badgeCount > 0 && (
                    <span className="ml-auto bg-rose-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                        {badgeCount}
                    </span>
                )}
            </button>
        </li>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ currentUser, onNavigate, onCreatePost, friendRequestCount, activeView, voiceCoins }) => {

  return (
    <aside className="w-72 bg-slate-800/50 border-r border-slate-700/50 p-4 flex-col flex-shrink-0 hidden md:flex">
      <div className="flex-grow">
        {/* Profile Section */}
        <button
            onClick={() => onNavigate('profile')}
            className="w-full flex items-center gap-4 p-3 rounded-lg text-left hover:bg-slate-700/50 mb-6 transition-colors"
        >
          <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-12 h-12 rounded-full" />
          <div>
            <p className="font-bold text-slate-100 text-lg">{currentUser.name}</p>
            <p className="text-sm text-slate-400">View Profile</p>
          </div>
        </button>

        {/* Navigation */}
        <nav>
          <ul className="space-y-2">
            <NavItem
                iconName="home"
                label="Home"
                isActive={activeView === AppView.FEED}
                onClick={() => onNavigate('feed')}
            />
            <NavItem
                iconName="users"
                label="Friends"
                isActive={activeView === AppView.FRIENDS}
                badgeCount={friendRequestCount}
                onClick={() => onNavigate('friends')}
            />
            <NavItem
                iconName="message"
                label="Messages"
                isActive={activeView === AppView.MESSAGES || activeView === AppView.CONVERSATIONS}
                onClick={() => onNavigate('messages')}
            />
             <NavItem
                iconName="briefcase"
                label="Sponsor Center"
                isActive={activeView === AppView.SPONSOR_CENTER}
                onClick={() => onNavigate('sponsor_center')}
            />
            <NavItem
                iconName="settings"
                label="Settings"
                isActive={activeView === AppView.SETTINGS}
                onClick={() => onNavigate('settings')}
            />
          </ul>
        </nav>
      </div>

      {/* Voice Coins */}
      <div className="mb-4 p-3 bg-slate-900/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
              <Icon name="coin" className="w-8 h-8 text-yellow-400" />
              <div>
                  <p className="font-semibold text-slate-200">Voice Coins</p>
                  <p className="text-xs text-slate-400">For AI features</p>
              </div>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{voiceCoins}</p>
      </div>


      {/* Create Post Button */}
      <div className="flex-shrink-0">
        <button
          onClick={onCreatePost}
          className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-lg py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
            <Icon name="mic" className="w-6 h-6"/>
            <span>Create Post</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;