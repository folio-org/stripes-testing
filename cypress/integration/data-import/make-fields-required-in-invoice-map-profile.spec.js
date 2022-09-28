import permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import Helper from '../../support/fragments/finance/financeHelper';

//
// import getRandomPostfix from '../../support/utils/stringTools';
// import DataImport from '../../support/fragments/data_import/dataImport';
// import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
// import Logs from '../../support/fragments/data_import/logs/logs';
// import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
//
// import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
//
// import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
// import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
// import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
// import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
// import InventorySearch from '../../support/fragments/inventory/inventorySearch';
// import permissions from '../../support/dictionary/permissions';
// import Users from '../../support/fragments/users/users';

describe('ui-data-import: Make some of the fields on the Invoice field mapping profile required', () => {
  let user = null;
  const mappingProfileName = `C343284 invoice mapping profile ${Helper.getRandomBarcode()}`;

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password, { path: TopMenu.mappingProfilesPath, waiter: FieldMappingProfiles.waitLoading });
        cy.getAdminToken();
      });
  });

  //   after(() => {

  //   });

  it('C343284 Make some of the fields on the Invoice field mapping profile required (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    FieldMappingProfiles.checkListOfExistingProfilesIsDisplayed();
    FieldMappingProfiles.openNewMappingProfileForm();
    FieldMappingProfiles.checkNewMappingProfileFormIsOpened();
    NewMappingProfile.addName(mappingProfileName);
    NewMappingProfile.addIncomingRecordType('EDIFACT invoice');
    NewMappingProfile.addFolioRecordType('Invoice');
    NewMappingProfile.saveProfile();
  });
});
