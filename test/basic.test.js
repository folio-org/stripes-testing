import { test, Page } from 'bigtest';
import { bigtestGlobals } from '@bigtest/globals';

import { Helpers, TextField, Button, MultiColumnList } from '@folio/stripes-testing';

bigtestGlobals.defaultInteractorTimeout = 10000;

export default test("Authentication: valid credentialss")
  .step(Page.visit("/"))
  .step(Helpers.Authn.login("diku_admin", "admin"))
  .step(Helpers.Core.Home().exists())
  .step(Helpers.Core.Nav().open("users"))
  .step(TextField({ id: "input-user-search" }).fillIn("edwina"))
  .step(Button("Search").click())
  .step(MultiColumnList({ id: "list-users" }).exists())
  .step(Helpers.Core.Nav().open("inventory"))
  .step(Helpers.Core.Nav().open("checkin"))
  .step(Helpers.Core.Nav().open("checkout"))
  .step(Helpers.Core.Nav().logout());
