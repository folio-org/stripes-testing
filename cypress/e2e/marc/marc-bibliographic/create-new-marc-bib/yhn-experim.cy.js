// import Permissions from '../../../../support/dictionary/permissions';
// import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
// import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
// import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
// import TopMenu from '../../../../support/fragments/topMenu';
// import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Create new MARC bib', () => {
  const marcBibTitle = `AutoMARC ${getRandomPostfix()}`;
  let uuid;
  let hrid;
  before(() => {
    cy.getAdminToken();
    cy.log(marcBibTitle);
    cy.createSimpleMarcBibViaAPI(marcBibTitle);
    QuickMarcEditor.getCreatedMarcBibIds(marcBibTitle).then((ids) => {
      uuid = ids.id;
      hrid = ids.hrid;
      cy.log(uuid);
      cy.log(hrid);
    });
  });

  beforeEach('Login to the application', () => {});

  after('Deleting created user', () => {
    // InventoryInstance.deleteInstanceViaApi(uuid);
  });

  it('test', () => {});
});
