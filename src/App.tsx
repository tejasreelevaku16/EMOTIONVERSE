import { useGameStore } from './hooks/useGameStore';
import { Landing } from './components/Landing';
import { EmotionSelection } from './components/EmotionSelection';
import { ExplorationScreen } from './components/ExplorationScreen';
import { EndingScreen } from './components/EndingScreen';

export default function App() {
  const screen = useGameStore((state) => state.screen);

  switch (screen) {
    case 'emotion_selection':
      return <EmotionSelection />;
    case 'exploration':
      return <ExplorationScreen />;
    case 'ending':
      return <EndingScreen />;
    case 'landing':
    default:
      return <Landing />;
  }
}
