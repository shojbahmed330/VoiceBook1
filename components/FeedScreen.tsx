

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Post, User, ScrollState, Campaign } from '../types';
import PostCard from './PostCard';
import CreatePostWidget from './CreatePostWidget';
import SkeletonPostCard from './SkeletonPostCard';
import { geminiService } from '../services/geminiService';
import { TTS_PROMPTS } from '../constants';
import RewardedAdWidget from './RewardedAdWidget';

interface FeedScreenProps {
  isLoading: boolean;
  posts: Post[];
  currentUser: User;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onOpenProfile: (userName: string) => void;
  onViewPost: (postId: string) => void;
  onLikePost: (postId: string) => void;
  onStartCreatePost: () => void;
  onRewardedAdClick: (campaign: Campaign) => void;
  scrollState: ScrollState;
  onAdViewed: (campaignId: string) => void;
  onAdClick: (post: Post) => void;
}

const FeedScreen: React.FC<FeedScreenProps> = ({ isLoading, posts, currentUser, onSetTtsMessage, lastCommand, onOpenProfile, onViewPost, onLikePost, onStartCreatePost, onRewardedAdClick, scrollState, onAdViewed, onAdClick }) => {
  const [currentPostIndex, setCurrentPostIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rewardedCampaign, setRewardedCampaign] = useState<Campaign | null>(null);
  
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const isInitialLoad = useRef(true);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    if (!isLoading && posts.length > 0 && isInitialLoad.current) {
      onSetTtsMessage(TTS_PROMPTS.feed_loaded);
    }
  }, [posts.length, isLoading, onSetTtsMessage]);
  
  useEffect(() => {
    const fetchRewardedCampaign = async () => {
        const camp = await geminiService.getRandomActiveCampaign();
        setRewardedCampaign(camp);
    };

    if (!isLoading) {
        fetchRewardedCampaign();
    }
  }, [isLoading]);

  // Handle continuous scrolling via voice command
  useEffect(() => {
    const scrollContainer = feedContainerRef.current;
    if (!scrollContainer || scrollState === 'none') {
        return;
    }

    let animationFrameId: number;

    const animateScroll = () => {
        if (scrollState === 'down') {
            scrollContainer.scrollTop += 2;
        } else if (scrollState === 'up') {
            scrollContainer.scrollTop -= 2;
        }
        animationFrameId = requestAnimationFrame(animateScroll);
    };

    animationFrameId = requestAnimationFrame(animateScroll);

    return () => {
        cancelAnimationFrame(animationFrameId);
    };
  }, [scrollState]);
  
  const handleCommand = useCallback(async (command: string) => {
    // Provide the names of authors on screen as context to the NLU
    const userNamesOnScreen = posts.map(p => p.isSponsored ? p.sponsorName as string : p.author.name);
    const intentResponse = await geminiService.processIntent(command, { userNames: userNamesOnScreen });
    
    switch (intentResponse.intent) {
      case 'intent_next_post':
        isProgrammaticScroll.current = true;
        setCurrentPostIndex(prev => (prev < 0 ? 0 : (prev + 1) % posts.length));
        setIsPlaying(true);
        break;
      case 'intent_previous_post':
        isProgrammaticScroll.current = true;
        setCurrentPostIndex(prev => (prev > 0 ? prev - 1 : posts.length - 1));
        setIsPlaying(true);
        break;
      case 'intent_play_post':
        if (currentPostIndex === -1 && posts.length > 0) {
            isProgrammaticScroll.current = true;
            setCurrentPostIndex(0);
        }
        setIsPlaying(true);
        break;
      case 'intent_pause_post':
        setIsPlaying(false);
        break;
      case 'intent_like':
        if(posts[currentPostIndex] && !posts[currentPostIndex].isSponsored) {
          onLikePost(posts[currentPostIndex].id);
        }
        break;
      case 'intent_comment':
      case 'intent_view_comments':
        if (posts[currentPostIndex] && !posts[currentPostIndex].isSponsored) {
          onViewPost(posts[currentPostIndex].id);
        }
        break;
      case 'intent_view_comments_by_author':
        if (intentResponse.slots?.target_name) {
            const targetName = (intentResponse.slots.target_name as string);
            const postToView = posts.find(p => !p.isSponsored && p.author.name === targetName);
            if (postToView) {
                onViewPost(postToView.id);
            } else {
                onSetTtsMessage(`Sorry, I couldn't find a recent post from ${intentResponse.slots.target_name} in your feed.`);
            }
        }
        break;
      case 'intent_open_profile':
        if (intentResponse.slots?.target_name) {
          onOpenProfile(intentResponse.slots.target_name as string);
        } else {
            // If no name, open current post's author profile
            if (posts[currentPostIndex] && !posts[currentPostIndex].isSponsored) {
                onOpenProfile(posts[currentPostIndex].author.name);
            }
        }
        break;
    }
  }, [posts, currentPostIndex, onOpenProfile, onLikePost, onViewPost, onSetTtsMessage]);

  useEffect(() => {
    if (lastCommand) {
      handleCommand(lastCommand);
    }
  }, [lastCommand, handleCommand]);

  // Effect for PROGRAMMATIC scrolling (when voice command changes index)
  useEffect(() => {
    if (isInitialLoad.current || posts.length === 0 || currentPostIndex < 0 || !isProgrammaticScroll.current) return;

    const cardElement = postRefs.current[currentPostIndex];
    if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const scrollTimeout = setTimeout(() => {
            isProgrammaticScroll.current = false;
        }, 1000); // Allow time for scroll animation to finish
        
        return () => clearTimeout(scrollTimeout);
    }
  }, [currentPostIndex, posts]);

  // Effect for tracking ad views and other logic when active post changes
  useEffect(() => {
    if (isInitialLoad.current || posts.length === 0 || currentPostIndex < 0) return;
    
    const activePost = posts[currentPostIndex];
    if (activePost?.isSponsored && activePost.campaignId) {
        onAdViewed(activePost.campaignId);
    }
  }, [currentPostIndex, posts, onAdViewed]);

  // Effect for MANUAL scrolling detection using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            if (isProgrammaticScroll.current) return;

            const intersectingEntries = entries.filter(entry => entry.isIntersecting);
            if (intersectingEntries.length > 0) {
                const mostVisibleEntry = intersectingEntries.reduce((prev, current) => 
                    prev.intersectionRatio > current.intersectionRatio ? prev : current
                );
                
                const indexStr = (mostVisibleEntry.target as HTMLElement).dataset.index;
                if (indexStr) {
                    const index = parseInt(indexStr, 10);
                    if (currentPostIndex !== index) {
                         setCurrentPostIndex(index);
                         setIsPlaying(false);
                    }
                }
            }
        },
        { 
            root: feedContainerRef.current,
            threshold: 0.6, // Fire when 60% of the element is visible
        }
    );

    const currentPostRefs = postRefs.current;
    currentPostRefs.forEach(ref => {
        if (ref) observer.observe(ref);
    });

    return () => {
        currentPostRefs.forEach(ref => {
            if (ref) observer.unobserve(ref);
        });
    };
  }, [posts, currentPostIndex]);


  useEffect(() => {
    if (posts.length > 0 && !isLoading && isInitialLoad.current) {
        isInitialLoad.current = false;
        // Do not set active post on load to prevent auto-scrolling.
        // Let the intersection observer handle it when user scrolls.
    }
  }, [posts, isLoading]);

  if (isLoading) {
    return (
      <div className="h-full w-full overflow-y-auto p-4 md:p-8">
        <div className="flex flex-col items-center justify-start gap-12">
          <SkeletonPostCard />
          <SkeletonPostCard />
          <SkeletonPostCard />
        </div>
      </div>
    );
  }

  if (posts.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 p-8 text-center">
        <h2 className="text-slate-300 text-2xl font-bold">Welcome to your feed!</h2>
        <p className="text-slate-400 max-w-sm">It's looking a little empty here. Why not break the ice and create your first voice post?</p>
        <div className="w-full max-w-lg">
            <CreatePostWidget user={currentUser} onClick={onStartCreatePost} />
        </div>
      </div>
    );
  }

  return (
    <div ref={feedContainerRef} className="h-full w-full overflow-y-auto p-4 md:p-8">
        <div className="flex flex-col items-center justify-start gap-12">
            <div className="w-full">
               <CreatePostWidget user={currentUser} onClick={onStartCreatePost} />
            </div>
             <div className="w-full">
               <RewardedAdWidget campaign={rewardedCampaign} onAdClick={onRewardedAdClick} />
            </div>
            {posts.map((post, index) => (
                <div 
                    key={`${post.id}-${index}`} 
                    className="w-full"
                    ref={el => { postRefs.current[index] = el; }}
                    data-index={index}
                >
                    <PostCard 
                        post={post} 
                        currentUser={currentUser}
                        isActive={index === currentPostIndex}
                        isPlaying={isPlaying && index === currentPostIndex}
                        onPlayPause={() => {
                            if (post.isSponsored && (post.videoUrl || post.imageUrl)) return;
                            if (index === currentPostIndex) {
                                setIsPlaying(p => !p)
                            } else {
                                isProgrammaticScroll.current = true;
                                setCurrentPostIndex(index);
                                setIsPlaying(true);
                            }
                        }}
                        onLike={onLikePost}
                        onViewPost={onViewPost}
                        onAuthorClick={onOpenProfile}
                        onAdClick={onAdClick}
                    />
                </div>
            ))}
        </div>
    </div>
  );
};

export default FeedScreen;
