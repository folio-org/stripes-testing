import { DEFAULT_JOB_PROFILE_NAMES, RECORD_STATUSES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../support/utils/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const { user, memberTenant } = parseSanityParameters();

      const querySearch = ['C350667*'];
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const createdJobProfile = {
        profileName: `Update MARC authority records - 010 $a ${getRandomPostfix()}`,
        acceptedType: 'MARC',
      };
      const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
      const updatedfileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
      const propertyName = 'authority';
      let createdAuthorityID;

      before('Creating data', () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();
        // make sure there are no duplicate records in the system
        querySearch.forEach((query) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(query);
        });

        // get default Action profile
        ActionProfile.getActionProfilesViaApi({
          query: 'name="Default - Create MARC Authority"',
        }).then(({ actionProfiles }) => {
          // create Job profile
          NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
            createdJobProfile.profileName,
            actionProfiles[0].id,
          );
        });

        DataImport.uploadFileViaApi('marcAuthFileForC350902.mrc', fileName, jobProfileToRun).then(
          (response) => {
            response.forEach((record) => {
              createdAuthorityID = record[propertyName].id;
            });
          },
        );
      });

      beforeEach('Login to the application', () => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
          authRefresh: true,
        });
        cy.allure().logCommandSteps();
      });

      after('Deleting data', () => {
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();
        SettingsJobProfiles.deleteJobProfileByNameViaApi(createdJobProfile.profileName);
        if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
      });

      it(
        'C350667 Update a MARC authority record via data import. Record match with 010 $a (spitfire)',
        { tags: ['dryRun', 'spitfire', 'C350667'] },
        () => {
          DataImport.uploadFile('test-auth-file.mrc', updatedfileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.waitLoadingList();
          JobProfiles.search(createdJobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(updatedfileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(updatedfileName);
          Logs.goToTitleLink(RECORD_STATUSES.CREATED);
          MarcAuthority.contains('MARC');
        },
      );
    });
  });
});
