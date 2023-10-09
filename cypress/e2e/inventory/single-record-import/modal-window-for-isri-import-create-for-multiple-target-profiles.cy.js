/* eslint-disable cypress/no-unnecessary-waiting */
import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import Users from '../../../support/fragments/users/users';
import SingleRecordImportModal from '../../../support/fragments/inventory/singleRecordImportModal';

describe('inventory', () => {
  describe('Single record import', () => {
    let user;
    let profileId;
    let createJobProfileId;
    let instanceHRID;
    const profile = {
      createJobProfile: `autotest jobProfileForCreate.${getRandomPostfix()}`,
      createActionProfile: `autotest actionProfileForCreate${getRandomPostfix()}`,
      createMappingProfile: `autotest mappingProfileForCreate${getRandomPostfix()}`,
    };
    const targetProfileName = `C375122 autotest profile${getRandomPostfix()}`;
    const testIdentifier = '1234567';
    const instanceTitle = 'The Gospel according to Saint Mark : Evangelistib Markusib aglangit.';

    before('create test data', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // create job profile for create
        NewFieldMappingProfile.createMappingProfileViaApi(profile.createMappingProfile).then(
          (mappingProfileResponse) => {
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
          },
        );
      });
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(profile.createJobProfile);
      ActionProfiles.deleteActionProfile(profile.createActionProfile);
      FieldMappingProfileView.deleteViaApi(profile.createMappingProfile);
      Users.deleteViaApi(user.userId);
      Z3950TargetProfiles.deleteTargetProfileViaApi(profileId);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C375122 Verify the modal window for ISRI Import/Create in inventory main actions menu for multiple target profiles (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        InventoryActions.openSingleReportImportModal();
        SingleRecordImportModal.verifyInventorySingleRecordModalWithSeveralTargetProfiles();
        SingleRecordImportModal.selectExternalTarget(targetProfileName);
        SingleRecordImportModal.selectTheProfileToBeUsed(profile.createJobProfile);
        SingleRecordImportModal.fillEnterTestIdentifier(testIdentifier);
        SingleRecordImportModal.import();
        InstanceRecordView.verifyCalloutMessage(testIdentifier);
        // need to wait because after the import the data in the instance is displayed for a long time
        // https://issues.folio.org/browse/MODCPCT-73
        cy.wait(10000);
        InstanceRecordView.verifyIsInstanceOpened(instanceTitle);
        InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;
        });
      },
    );
  });
});
