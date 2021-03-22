import { HTML } from '@bigtest/interactor';
import { or } from '@bigtest/interactor';
import { Button, Dropdown } from '../interactors';

const App = HTML.extend('app-container')
  .selector("main#ModuleContainer")
  .filters({
    name: (el) => {
      const app = Array.from(el.children).find(e => e.id.endsWith('-module-display'));
      return app?.id.substr(0, app.id.indexOf("-module-display"));
    },
  })

export const Home = HTML.extend('app')
  .selector('main#ModuleContainer');

export const Nav = HTML.extend('Navigation')
  .selector('header')
  .actions({
    open: async (interactor, app) => {
      await interactor.find(Button({ id: `app-list-item-clickable-${app}-module`, visible: or(false, true) })).click();
      await App({ name: app }).exists();
    },
    logout: async (interactor) => {
      await interactor.find(Dropdown('Online')).choose('Log out', true);
      await Button('Log in').exists();
    }
  });
