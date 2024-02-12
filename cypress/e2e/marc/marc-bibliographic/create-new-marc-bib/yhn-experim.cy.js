// import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
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
  let holdUuid;
  before(() => {
    cy.getAdminToken();
    cy.log(marcBibTitle);
    cy.createSimpleMarcBibViaAPI(marcBibTitle);
    QuickMarcEditor.getCreatedMarcBib(marcBibTitle).then((bib) => {
      uuid = bib.id;
      hrid = bib.hrid;
      cy.createSimpleMarcHoldingsViaAPI(uuid, hrid, 'E', marcBibTitle);
      QuickMarcEditor.getCreatedMarcHoldings(uuid, marcBibTitle).then((hold) => {
        holdUuid = hold.id;
      });
    });
  });

  beforeEach('Login to the application', () => {});

  after('Deleting created user', () => {
    cy.deleteHoldingRecordViaApi(holdUuid);
    InventoryInstance.deleteInstanceViaApi(uuid);
  });

  it('test', () => {});
});
