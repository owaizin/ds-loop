import * as UI from '@example/ui';
import { Field as EmailField } from '@example/ui/forms';
import { LocalNotice } from './LocalNotice';

export function App() {
  return <main><UI.Card /><EmailField /><UI.Button /><LocalNotice /></main>;
}
