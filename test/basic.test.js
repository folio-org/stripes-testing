import { test, Page } from 'bigtest';
import { bigtestGlobals } from '@bigtest/globals';

import { TextField, Button, MultiColumnList } from '../interactors';
import { Core, Authn } from '../helpers';

bigtestGlobals.defaultInteractorTimeout = 10000;

export default test('Authentication: valid credentials')
  .step(Page.visit('/'))
  .step(Authn.login('diku_admin', 'admin'))
  .step(Core.Home().exists())
  .step(Core.Nav().open('users'))
  .step(TextField({ id: 'input-user-search' }).fillIn('edwina'))
  .step(Button('Search').click())
  .step(MultiColumnList({ id: 'list-users' }).exists())
  .step(Core.Nav().open('inventory'))
  .step(Core.Nav().open('checkin'))
  .step(Core.Nav().open('checkout'))
  .step(Core.Nav().logout());
