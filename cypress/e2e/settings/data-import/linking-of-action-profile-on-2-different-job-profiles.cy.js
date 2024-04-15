import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const actionProfileName = 'Default - Create instance';
    const jobProfile1 = {
      profileName: `C440093 Testing of linking for jobs 1${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const jobProfile2 = {
      profileName: `C440093 Testing of linking for jobs 2${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password);
        cy.visit(SettingsMenu.jobProfilePath);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile1.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile2.profileName);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C440093 Check the linking of Action profile on 2 different Job profiles (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        JobProfiles.createJobProfile(jobProfile1);
        NewJobProfile.linkActionProfileByName(actionProfileName);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile1.profileName);
        JobProfileView.verifyJobProfileOpened();

        JobProfileView.duplicate();
        cy.wait(1500);
        NewJobProfile.fillProfileName(jobProfile2.profileName);
        cy.wait(1500);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile2.profileName);
        JobProfileView.verifyJobProfileOpened();

        JobProfiles.search(jobProfile1.profileName);
        JobProfileView.edit();
        JobProfileEdit.verifyScreenName(jobProfile1.profileName);
        JobProfileEdit.unlinkActionProfile(0);
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyLinkedProfiles([actionProfileName], 0);

        JobProfiles.search(jobProfile2.profileName);
        JobProfileView.verifyLinkedProfiles([actionProfileName], 1);
        JobProfileView.edit();
        JobProfileEdit.verifyScreenName(jobProfile1.profileName);
        JobProfileEdit.unlinkActionProfile(0);
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyLinkedProfiles([actionProfileName], 0);

        JobProfiles.search(jobProfile1.profileName);
        JobProfileView.edit();
        JobProfileEdit.linkActionProfileByName(actionProfileName);
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyLinkedProfiles([actionProfileName], 1);

        JobProfiles.search(jobProfile2.profileName);
        JobProfileView.verifyLinkedProfiles([actionProfileName], 0);
      },
    );
  });
});
