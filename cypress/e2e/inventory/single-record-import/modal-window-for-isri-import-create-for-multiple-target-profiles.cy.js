/* eslint-disable cypress/no-unnecessary-waiting */
import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import SingleRecordImportModal from '../../../support/fragments/inventory/singleRecordImportModal';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Single record import', () => {
    let user;
    let profileId;
    let createJobProfileId;
    let instanceHRID;
    const profile = {
      createJobProfile: `Inventory Single Record - Default Create Instance.${getRandomPostfix()}`,
      createActionProfile: {
        name: `autotest actionProfileForCreate${getRandomPostfix()}`,
        action: 'CREATE',
        folioRecordType: 'INSTANCE',
      },
      createMappingProfile: {
        name: `autotest mappingProfileForCreate${getRandomPostfix()}`,
      },
    };
    const targetProfileName = `C375122 autotest profile${getRandomPostfix()}`;
    const testIdentifier = '1234567';
    const instanceTitle = 'The Gospel according to Saint Mark : Evangelistib Markusib aglangit.';

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // create job profile for create
        NewFieldMappingProfile.createInstanceMappingProfileViaApi(
          profile.createMappingProfile,
        ).then((mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            profile.createActionProfile,
            mappingProfileResponse.body.id,
          )
            .then((actionProfileResponse) => {
              NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
                profile.createJobProfile,
                actionProfileResponse.body.id,
              );
            })
            .then((id) => {
              createJobProfileId = id;

              Z3950TargetProfiles.createNewZ3950TargetProfileViaApi(targetProfileName, [
                createJobProfileId,
              ]).then((initialId) => {
                profileId = initialId;
              });
            });

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(profile.createJobProfile);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.createActionProfile);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(profile.createMappingProfile);
        Users.deleteViaApi(user.userId);
        Z3950TargetProfiles.deleteTargetProfileViaApi(profileId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C375122 Verify the modal window for ISRI Import/Create in inventory main actions menu for multiple target profiles (folijet)',
      { tags: ['criticalPath', 'folijet', 'C375122'] },
      () => {
        const calloutMessage = `Record ${testIdentifier} created. Results may take a few moments to become visible in Inventory`;

        InventoryActions.openSingleReportImportModal();
        SingleRecordImportModal.verifyInventorySingleRecordModalWithSeveralTargetProfiles();
        SingleRecordImportModal.selectExternalTarget(targetProfileName);
        SingleRecordImportModal.selectTheProfileToBeUsed(profile.createJobProfile);
        SingleRecordImportModal.fillEnterTestIdentifier(testIdentifier);
        SingleRecordImportModal.import();
        InstanceRecordView.verifyCalloutMessage(calloutMessage);
        // need to wait because after the import the data in the instance is displayed for a long time
        // https://issues.folio.org/browse/MODCPCT-73
        cy.wait(15000);
        InstanceRecordView.verifyInstanceIsOpened(instanceTitle);
        InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;
        });
      },
    );
  });
});
