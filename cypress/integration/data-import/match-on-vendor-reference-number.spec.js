/* eslint-disable cypress/no-unnecessary-waiting */
import TestTypes from '../../support/dictionary/testTypes';
import NewOrder from '../../support/fragments/orders/newOrder';
import Helper from '../../support/fragments/finance/financeHelper';
import TopMenu from '../../support/fragments/topMenu';
import Logs from '../../support/fragments/data_import/logs/logs';
import MatchOnVRN from '../../support/fragments/data_import/matchOnVRN';
import FileManager from '../../support/utils/fileManager';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Orders from '../../support/fragments/orders/orders';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';

describe('ui-data-import: Match on VRN and update related Instance, Holdings, Item', () => {
  let userId = null;
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    vendor: 'GOBI Library Solutions',
  };
  const instanceMappingProfileName = `CaseC350591 Update Instance by VRN match ${Helper.getRandomBarcode()}`;
  const holdingsMappingProfileName = `CaseC350591 Update Holdings by VRN match ${Helper.getRandomBarcode()}`;
  const itemMappingProfileName = `CaseC350591 Update Item by VRN match ${Helper.getRandomBarcode()}`;
  const instanceActionProfileName = `CaseC350591 Action for Instance ${Helper.getRandomBarcode()}`;
  const holdingsActionProfileName = `CaseC350591 Action for Holdings ${Helper.getRandomBarcode()}`;
  const itemActionProfileName = `CaseC350591 Action for Item ${Helper.getRandomBarcode()}`;
  const instanceMatchProfileName = `CaseC350591 Match for Instance ${Helper.getRandomBarcode()}`;
  const holdingsMatchProfileName = `CaseC350591 Match for Holdings ${Helper.getRandomBarcode()}`;
  const itemMatchProfileName = `CaseC350591 Match for Item ${Helper.getRandomBarcode()}`;
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
    name: `CaseC350591 Job profile ${Helper.getRandomBarcode()}`,
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
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
    ]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
    });

    cy.readFile(`cypress/fixtures/${filePath}`).then(content => {
      FileManager.createFile(`cypress/fixtures/${fileName}`, content);
    });
  });

  after(() => {
    Users.deleteViaApi(userId);
    MatchOnVRN.deletePOLineViaAPI(MatchOnVRN.poLineData.title);
    MatchOnVRN.deleteItemViaAPI();
  });

  it('C350591 Match on VRN and update related Instance, Holdings, Item (folijet)', { tags: [TestTypes.smoke] }, () => {
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
    MatchOnVRN.verifyInstanceStatusNotUpdated();
    MatchOnVRN.clickOnUpdatedHotlink();
    MatchOnVRN.verifyInstanceUpdated();
    MatchOnVRN.verifyHoldingsUpdated();
    MatchOnVRN.verifyItemUpdated();
    MatchOnVRN.verifyMARCBibSource();
  });
});
