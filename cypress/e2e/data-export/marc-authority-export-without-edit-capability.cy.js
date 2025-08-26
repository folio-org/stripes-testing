import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import Users from '../../support/fragments/users/users';
import DataImport from '../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../support/constants';
import getRandomPostfix from '../../support/utils/stringTools';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';

let user;
let createdAuthorityID;
const marcFile = {
  marc: 'marcAuthFileC523664.mrc',
  fileName: `testMarcFileC523664.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
  numOfRecords: 1,
};

describe('Data Export', () => {
  before('Create test data', () => {
    cy.getAdminToken();
    // make sure there are no duplicate authority records in the system
    MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C523664');
    DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun).then(
      (response) => {
        response.forEach((record) => {
          createdAuthorityID = record.authority.id;
        });
      },
    );
    cy.createTempUser([
      permissions.dataExportViewOnly.gui,
      permissions.dataExportSettingsViewOnly.gui,
      permissions.dataExportViewAddUpdateProfiles.gui,
      permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    MarcAuthority.deleteViaAPI(createdAuthorityID, true);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C523664 "MARC authority" app - User is NOT able to do quick export without "data - UI-Data-Export - edit" capability set (firebird)',
    { tags: ['extendedPath', 'firebird', 'C523664'] },
    () => {
      MarcAuthorities.searchBeats('AT_C523664');
      MarcAuthorities.select(createdAuthorityID);
      MarcAuthorities.checkSelectAuthorityRecordCheckbox('AT_C523664');
      MarcAuthorities.clickActionsButton();
      MarcAuthorities.verifyExportSelectedRecordsButtonAbsent();
      MarcAuthorities.selectFirstRecord();
      MarcAuthorities.verifyMarcViewPaneIsOpened();
      MarcAuthority.checkActionDropdownContent(['Edit', 'Print']);
    },
  );
});
