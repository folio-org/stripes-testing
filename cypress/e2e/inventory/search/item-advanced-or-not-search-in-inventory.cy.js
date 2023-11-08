import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Parallelization from '../../../support/dictionary/parallelization';

describe('Inventory -> Advanced search', () => {
  before('Creating data', () => {
    cy.loginAsAdmin({ path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
  });

  it(
    'C400623 Search Items using advanced search with "OR", "NOT" operators (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {},
  );
});
