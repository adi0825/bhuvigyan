import { useState } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

const steps: Step[] = [
  {
    target: '[data-testid="dashboard-welcome"]',
    content: 'Welcome to Bhuvigyan! This is your personalized dashboard for crop insurance.',
    title: 'Welcome',
    placement: 'center',
  },
  {
    target: '[data-testid="stat-cards"]',
    content: 'These cards show your land area, claims, carbon score, and alerts at a glance.',
    title: 'Key Stats',
    placement: 'bottom',
  },
  {
    target: '[data-testid="tab-nav"]',
    content: 'Navigate between Overview, Land, Claims, Carbon, and Notifications here.',
    title: 'Navigation',
    placement: 'bottom',
  },
  {
    target: '[data-testid="notifications-tab"]',
    content: 'Check alerts for your claims, carbon updates, and important messages.',
    title: 'Notifications',
    placement: 'left',
  },
  {
    target: '[data-testid="carbon-section"]',
    content: 'Earn carbon credits for sustainable farming practices. Check your eligibility!',
    title: 'Carbon Credits',
    placement: 'top',
  },
];

export default function OnboardingTour() {
  const [run, setRun] = useState(() => {
    return localStorage.getItem('tourCompleted') !== 'true';
  });

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem('tourCompleted', 'true');
      setRun(false);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      callback={handleCallback}
      styles={{
        options: {
          arrowColor: '#1a6b3c',
          backgroundColor: '#ffffff',
          textColor: '#1a1a1a',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          primaryColor: '#1a6b3c',
          zIndex: 1000,
        },
        spotlight: {
          backgroundColor: 'transparent',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip',
      }}
    />
  );
}