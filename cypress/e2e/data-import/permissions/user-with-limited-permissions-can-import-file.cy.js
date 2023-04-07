import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import Helper from '../../../support/fragments/finance/financeHelper';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('ui-data-import', () => {
  let firstUser;
  let secondUser;
  let instanceHrid;
  const quantityOfItems = '1';
  // unique profile names
  const itemMappingProfileName = `C356841 item mapping profile ${Helper.getRandomBarcode()}`;
  const holdingsMappingProfileName = `C356841 holdings mapping profile ${Helper.getRandomBarcode()}`;
  const itemActionProfileName = `C356841 item action profile ${Helper.getRandomBarcode()}`;
  const holdingsActionProfileName = `C356841 holdings action profile ${Helper.getRandomBarcode()}`;
  const jobProfileName = `C356841 job profile ${Helper.getRandomBarcode()}`;
  const nameMarcFile = `C356841autotestFile.${Helper.getRandomBarcode()}.mrc`;
  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.holdings,
        name: holdingsMappingProfileName,
        pernanentLocation: '"Online (E)"' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: holdingsActionProfileName }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.item,
        name: itemMappingProfileName,
        permanentLoanType: '"Can circulate"',
        status: 'Available' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: itemActionProfileName }
    }
  ];
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName
  };

  before('create test data', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        firstUser = userProperties;
      });

    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportCanViewOnly.gui
    ])
      .then(userProperties => {
        secondUser = userProperties;
      });
  });

  after(() => {
    Users.deleteViaApi(firstUser.userId);
    Users.deleteViaApi(secondUser.userId);
    // delete generated profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    ActionProfiles.deleteActionProfile(itemActionProfileName);
    ActionProfiles.deleteActionProfile(holdingsActionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(itemMappingProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(holdingsMappingProfileName);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C356841 Confirm a user with limited Data Import permissions can import a file (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      cy.login(firstUser.username, firstUser.password, { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      // create mapping profiles
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
      NewFieldMappingProfile.fillMaterialType();
      NewFieldMappingProfile.fillPermanentLoanType(collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLoanType);
      NewFieldMappingProfile.fillStatus(collectionOfMappingAndActionProfiles[1].mappingProfile.status);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfileName);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
      NewFieldMappingProfile.fillPermanentLocation(collectionOfMappingAndActionProfiles[0].mappingProfile.pernanentLocation);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfileName);

      // create action profiles
      collectionOfMappingAndActionProfiles.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfileByName('Default - Create instance');
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileName);

      cy.logout();
      cy.login(secondUser.username, secondUser.password, { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
      FieldMappingProfiles.verifyActionMenuAbsent();
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.checkListOfExistingProfilesIsDisplayed();
      ActionProfiles.verifyActionMenuAbsent();
      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.checkListOfExistingProfilesIsDisplayed();
      MatchProfiles.verifyActionMenuAbsent();
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.checkListOfExistingProfilesIsDisplayed();
      JobProfiles.verifyActionMenuAbsent();
      cy.visit(SettingsMenu.fileExtensionsPath);
      FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
      FileExtensions.verifyActionMenuAbsent();

      cy.visit(TopMenu.dataImportPath);
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.uploadFile('oneMarcBib.mrc', nameMarcFile);
      JobProfiles.searchJobProfileForImport(jobProfileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFile);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(nameMarcFile);
      [FileDetails.columnNameInResultList.srsMarc,
        FileDetails.columnNameInResultList.instance,
        FileDetails.columnNameInResultList.holdings,
        FileDetails.columnNameInResultList.item
      ].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });
      FileDetails.checkItemQuantityInSummaryTable(quantityOfItems);

      // get Instance HRID through API
      InventorySearchAndFilter.getInstanceHRID()
        .then(hrId => {
          instanceHrid = hrId[0];
        });
    });
});
