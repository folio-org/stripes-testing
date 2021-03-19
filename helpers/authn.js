import { TextField } from 'bigtest';
import { Button, Dropdown } from '@folio/stripes-testing/interactors';

export const login = (username, password) => {
  return {
    description: 'Sign in to FOLIO',
    action: async () => {
      await TextField('Username').fillIn(username);
      await TextField('Password').fillIn(password);
      await Button('Log in').click();
    },
  };
};

export const logout = () => {
  return {
    description: 'Sign out of FOLIO',
    action: async () => {
      await Dropdown('Online').choose('Log out');
      await Button('Log in').exists();
    },
  };
};
