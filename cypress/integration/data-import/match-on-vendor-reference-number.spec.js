/* eslint-disable cypress/no-unnecessary-waiting */
import TestTypes from '../../support/dictionary/testTypes';
import NewOrder from '../../support/fragments/orders/newOrder';
import FinanceHelper from '../../support/fragments/finance/financeHelper';
import TopMenu from '../../support/fragments/topMenu';
import Logs from '../../support/fragments/data_import/logs/logs';
import MatchOnVRN from '../../support/fragments/data_import/matchOnVRN';
import FileManager from '../../support/utils/fileManager';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Orders from '../../support/fragments/orders/orders';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import users from '../../support/fragments/users/users';

describe('ui-data-import: Match on VRN and update related Instance, Holdings, Item', () => {
  let userId = null;
  const order = {
    ...NewOrder.defaultOrder,
    vendor: 'GOBI Library Solutions',
  };
  const instanceMappingProfileName = `CaseC350591 Update Instance by VRN match ${FinanceHelper.getRandomBarcode()}`;
  const holdingsMappingProfileName = `CaseC350591 Update Holdings by VRN match ${FinanceHelper.getRandomBarcode()}`;
  const itemMappingProfileName = `CaseC350591 Update Item by VRN match ${FinanceHelper.getRandomBarcode()}`;
  const instanceActionProfileName = `CaseC350591 Action for Instance ${FinanceHelper.getRandomBarcode()}`;
  const holdingsActionProfileName = `CaseC350591 Action for Holdings ${FinanceHelper.getRandomBarcode()}`;
  const itemActionProfileName = `CaseC350591 Action for Item ${FinanceHelper.getRandomBarcode()}`;
  const instanceMatchProfileName = `CaseC350591 Match for Instance ${FinanceHelper.getRandomBarcode()}`;
  const holdingsMatchProfileName = `CaseC350591 Match for Holdings ${FinanceHelper.getRandomBarcode()}`;
  const itemMatchProfileName = `CaseC350591 Match for Item ${FinanceHelper.getRandomBarcode()}`;
  const matchProfiles = [
    {
      name: instanceMatchProfileName,
      existingRecordType: 'INSTANCE',
    },
    {
      name: holdingsMatchProfileName,
      existingRecordType: 'HOLDINGS',
    },
    {
      name: itemMatchProfileName,
      existingRecordType: 'ITEM',
    },
  ];
  const filePath = 'matchOnVendorReferenceNumber.mrc';
  const fileName = `vrn${getRandomPostfix()}.mrc`;

  const jobProfilesData = {
    name: `CaseC350591 Job profile ${FinanceHelper.getRandomBarcode()}`,
    dataType: 'MARC',
    matches: [
      {
        matchName: instanceMatchProfileName,
        actionName: instanceActionProfileName,
      },
      {
        matchName: holdingsMatchProfileName,
        actionName: holdingsActionProfileName,
      },
      {
        matchName: itemMatchProfileName,
        actionName: itemActionProfileName,
      },
    ]
  };

  before(() => {
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersDelete.gui,
      permissions.inventoryAll.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.dataImportDeleteLogs.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
    });

    cy.readFile(`cypress/fixtures/${filePath}`).then(content => {
      FileManager.createFile(`cypress/fixtures/${fileName}`, content);
    });
  });

  after(() => {
    users.deleteViaApi(userId);
  });

  it('C350591 Match on VRN and update related Instance, Holdings, Item', { tags: [TestTypes.smoke] }, () => {
    // create order
    cy.visit(TopMenu.ordersPath);
    Orders.createOrder(order);
    MatchOnVRN.verifyCreatedOrder(order);

    // add and verify po line
    Orders.createPOLineViaActions();
    MatchOnVRN.fillPOLineInfo();
    MatchOnVRN.goBackToPO();
    MatchOnVRN.openOrder();
    MatchOnVRN.verifyOrderStatus();

    // create field mapping profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    MatchOnVRN.creatMappingProfilesForInstance(instanceMappingProfileName)
      .then(() => {
        MatchOnVRN.creatMappingProfilesForHoldings(holdingsMappingProfileName);
      }).then(() => {
        MatchOnVRN.creatMappingProfilesForItem(itemMappingProfileName);
      });

    // create action profiles
    cy.visit(SettingsMenu.actionProfilePath);
    MatchOnVRN.createActionProfileForVRN(instanceActionProfileName, 'Instance', instanceMappingProfileName);
    MatchOnVRN.createActionProfileForVRN(holdingsActionProfileName, 'Holdings', holdingsMappingProfileName);
    MatchOnVRN.createActionProfileForVRN(itemActionProfileName, 'Item', itemMappingProfileName);

    // create match profiles
    cy.visit(SettingsMenu.matchProfilePath);
    MatchOnVRN.waitJSONSchemasLoad();
    matchProfiles.forEach(match => {
      MatchOnVRN.createMatchProfileForVRN(match);
    });

    // create job profiles
    cy.visit(SettingsMenu.jobProfilePath);
    MatchOnVRN.createJobProfileForVRN(jobProfilesData);

    // import a file
    cy.visit(TopMenu.dataImportPath);
    cy.uploadFileWithDefaultJobProfile(fileName, jobProfilesData.name);
    FileManager.deleteFile(`cypress/fixtures/${fileName}`);

    // verify Instance, Holdings and Item details
    Logs.openFileDetails(fileName);
    MatchOnVRN.clickOnUpdatedHotlink();
    MatchOnVRN.verifyInstanceUpdated();
    MatchOnVRN.verifyHoldingsUpdated();
    MatchOnVRN.verifyItemUpdated();
    MatchOnVRN.verifyMARCBibSource();

    MatchOnVRN.deleteItem();
    MatchOnVRN.deleteHoldings();
    MatchOnVRN.deletePOLine();
  });
});
