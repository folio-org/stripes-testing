import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import Parallelization from '../../../support/dictionary/parallelization';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';

describe('Inventory -> Advanced search', () => {
  let user;
  const testData = {
    callNumberValue: `CN${getRandomPostfix()}`,
    advSearchOption: 'Advanced search',
    searchResults: [],
    rowsCount: 3,
    defaultSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
  };

  before('Creating data', () => {
    cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  it(
    'C400621 Search Holdings using advanced search with a combination of operators (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {},
  );
});
