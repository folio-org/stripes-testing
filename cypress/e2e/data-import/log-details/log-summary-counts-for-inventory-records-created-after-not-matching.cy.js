import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import {
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  LOCATION_NAMES,
  LOAN_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES
} from '../../../support/constants';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';

describe('ui-data-import', () => {
  let user;
  const marcFileName = `C378901autotestFile.${getRandomPostfix()}.mrc`;
  const barcodes = ['B(UMLLTTEST3)LLTAMGUT8UGUT_-UM', 'B(UMLLTTEST3)LLTAALIVIAUCO_-UM'];
  const firstInstanceTitle = '<In lacu> Guillelmus de Sancto Theodorico (dubium) [electronic resource]';
  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C378901 instance mapping profile ${getRandomPostfix()}`,
        catalogedDate: '###TODAY###',
        instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C378901 instance action profile ${getRandomPostfix()}` }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C378901 holdings mapping profile ${getRandomPostfix()}`,
        permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
        permanentLocationUI: LOCATION_NAMES.ONLINE_UI,
        callNumberType: '852$t',
        callNumber: '852$h',
        relationship: '"Resource"',
        uri: '856$u',
        link: '856$y' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C378901 holdings action profile${getRandomPostfix()}` }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C378901 item mapping profile ${getRandomPostfix()}`,
        barcode: '876$a',
        materialType: '877$m',
        permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        status: ITEM_STATUS_NAMES.AVAILABLE },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C378901 item action profile${getRandomPostfix()}` }
    }
  ];
  const matchProfile = {
    profileName: `C378901 match profile ${getRandomPostfix()}`,
    incomingRecordFields: {
      field: '034',
      in1: '9',
      in2: ' ',
      subfield: 'a'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
    instanceOption: NewMatchProfile.optionsList.systemControlNumber
  };
  const jobProfile = { ...NewJobProfile.defaultJobProfile,
    profileName: `C378901 job profile ${getRandomPostfix()}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC };

  before('login', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.uiInventoryViewInstances.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    MatchProfiles.deleteMatchProfile(matchProfile.profileName);
    collectionOfMappingAndActionProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(barcodes[0]);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(barcodes[1]);
  });

  const createInstanceMappingProfile = (profile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
    NewFieldMappingProfile.fillCatalogedDate(profile.catalogedDate);
    NewFieldMappingProfile.fillInstanceStatusTerm();
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(profile.name);
  };
  const createHoldingsMappingProfile = (profile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
    NewFieldMappingProfile.fillPermanentLocation(profile.permanentLocation);
    NewFieldMappingProfile.fillCallNumberType(profile.callNumberType);
    NewFieldMappingProfile.fillCallNumber(profile.callNumber);
    NewFieldMappingProfile.addElectronicAccess(profile.relationship, profile.uri, profile.link);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(profile.name);
  };
  const createItemMappingProfile = (profile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
    NewFieldMappingProfile.fillBarcode(profile.barcode);
    NewFieldMappingProfile.fillMaterialType(profile.materialType);
    NewFieldMappingProfile.fillPermanentLoanType(profile.permanentLoanType);
    NewFieldMappingProfile.fillStatus(profile.status);
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(profile.name);
  };

  it('C378901 Check log summary counts for inventory records created after NOT matching (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // create mapping profiles
      createInstanceMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[0].mappingProfile.name);
      createHoldingsMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[1].mappingProfile.name);
      createItemMappingProfile(collectionOfMappingAndActionProfiles[2].mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[2].mappingProfile.name);

      // create action profiles
      collectionOfMappingAndActionProfiles.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create match profile
      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.createMatchProfile(matchProfile);
      MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkMatchAndThreeActionProfiles(
        matchProfile.profileName,
        collectionOfMappingAndActionProfiles[0].actionProfile.name,
        collectionOfMappingAndActionProfiles[1].actionProfile.name,
        collectionOfMappingAndActionProfiles[2].actionProfile.name,
        1
      );
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      // upload .mrc file
      cy.visit(TopMenu.dataImportPath);
      DataImport.checkIsLandingPageOpened();
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile('marcFileForC378901.mrc', marcFileName);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileName);
      Logs.checkStatusOfJobProfile();
      Logs.openFileDetails(marcFileName);
      [FileDetails.columnNameInResultList.srsMarc,
        FileDetails.columnNameInResultList.instance,
        FileDetails.columnNameInResultList.holdings,
        FileDetails.columnNameInResultList.item].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });
      // check created counter in the Summary table
      FileDetails.checkItemsQuantityInSummaryTable(0, '2');
      // check Updated counter in the Summary table
      FileDetails.checkItemsQuantityInSummaryTable(1, '0');
      // check No action counter in the Summary table
      FileDetails.checkItemsQuantityInSummaryTable(2, '0');
      // check Error counter in the Summary table
      FileDetails.checkItemsQuantityInSummaryTable(3, '0');

      FileDetails.openInstanceInInventory('Created');
      InstanceRecordView.verifyIsInstanceOpened(firstInstanceTitle);
      cy.go('back');
      FileDetails.openHoldingsInInventory('Created');
      HoldingsRecordView.checkPermanentLocation(collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocationUI);
      cy.go('back');
      FileDetails.openItemInInventory('Created');
      ItemRecordView.verifyItemStatus(collectionOfMappingAndActionProfiles[2].mappingProfile.status);
    });
});
