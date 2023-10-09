import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import NewTargetProfile from '../../../support/fragments/settings/inventory/integrations/newTargetProfile';
import EditTargetProfile from '../../../support/fragments/settings/inventory/integrations/editTargetProfile';
import Users from '../../../support/fragments/users/users';

describe('inventory', () => {
  describe('Settings', () => {
    let user;
    const targetProfileName = `C374178 autotest targetProfileName ${getRandomPostfix()}`;
    const newTargetProfileName = `C374178 autotest targetProfileName ${getRandomPostfix()}`;
    const firstCreateProfileName =
      'Inventory Single Record - Default Create Instance (d0ebb7b0-2f0f-11eb-adc1-0242ac120002)';
    const secondCreateProfileName =
      'Default - Create instance and SRS MARC Bib (e34d7b92-9b83-11eb-a8b3-0242ac130003)';
    const firstRow = 1;
    const secondRow = 2;
    const firstUpdateProfileName =
      'Inventory Single Record - Default Update Instance (91f9b8d6-d80e-4727-9783-73fb53e3c786)';

    before('create test data', () => {
      cy.createTempUser([
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      Z3950TargetProfiles.getTargetProfileIdViaApi({
        query: `name="${newTargetProfileName}"`,
      }).then((profileId) => {
        Z3950TargetProfiles.deleteTargetProfileViaApi(profileId);
      });
    });

    it(
      'C374178 Verify the create/edit mode for ISRI profiles (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.targetProfilesPath);
        Z3950TargetProfiles.create();
        NewTargetProfile.newFormContains();
        NewTargetProfile.fillName(targetProfileName);
        NewTargetProfile.save();
        NewTargetProfile.verifyErrorMessageIsPresented();
        NewTargetProfile.verifyJobProfileForImportCreateAccordion();
        NewTargetProfile.selectJobProfileForImportCreate(firstCreateProfileName);
        NewTargetProfile.addJobProfileForImportCreate();
        NewTargetProfile.selectJobProfileForImportCreate(secondCreateProfileName, firstRow, 1);
        NewTargetProfile.setDefaultJobProfileForCreate(firstRow);
        NewTargetProfile.removeJobProfileForImportCreate(secondCreateProfileName, secondRow);
        NewTargetProfile.verifyJobProfileForImportCreateIsRemoved();
        NewTargetProfile.setDefaultJobProfileForCreate();

        NewTargetProfile.addJobProfileForOverlayUpdate();
        NewTargetProfile.verifyJobProfileForOverlayUpdateAccordion();
        NewTargetProfile.selectJobProfileForOverlayUpdate(firstUpdateProfileName);
        NewTargetProfile.selectJobProfileForOverlayUpdate(secondCreateProfileName, firstRow, 1);
        NewTargetProfile.setDefaultJobProfileForUpdate(firstRow);
        NewTargetProfile.removeJobProfileForImportCreate(secondCreateProfileName, secondRow);
        NewTargetProfile.verifyJobProfileForImportCreateIsRemoved();
        NewTargetProfile.setDefaultJobProfileForUpdate();
        NewTargetProfile.save();
        Z3950TargetProfiles.verifyTargetProfileIsCreated(targetProfileName);

        Z3950TargetProfiles.edit(`✕ ${targetProfileName}`);
        EditTargetProfile.verifyTargetProfileFormOpened();
        EditTargetProfile.fillName(newTargetProfileName);
        EditTargetProfile.save(targetProfileName);
        Z3950TargetProfiles.verifyTargetProfileIsUpdated(targetProfileName, newTargetProfileName);
      },
    );
  });
});
