import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ItemRecordEdit from '../../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../../support/fragments/settings/dataImport';
import ActionProfiles from '../../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Item', () => {
      const testData = {
        marcFilePath: 'oneMarcBib.mrc',
        marcFileName: `C651536 autotestFileName${getRandomPostfix()}.mrc`,
        instanceTitle:
          'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)',
        location: LOCATION_NAMES.ANNEX_UI,
      };
      // profiles for creating holdings, item
      const instanceActionProfileName = 'Default - Create instance';
      const collectionOfProfiles = [
        {
          mappingProfile: {
            name: `C651536 holdings mapping profile${getRandomPostfix()}`,
            permanentLocation: null,
          },
          actionProfile: {
            name: `C651536 holdings action profile${getRandomPostfix()}`,
            action: 'CREATE',
            folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          },
        },
        {
          mappingProfile: {
            name: `C651536 item mapping profile${getRandomPostfix()}`,
            materialType: null,
            permanentLoanType: null,
            status: ITEM_STATUS_NAMES.AVAILABLE,
          },
          actionProfile: {
            name: `C651536 item action profile${getRandomPostfix()}`,
            action: 'CREATE',
            folioRecordType: EXISTING_RECORD_NAMES.ITEM,
          },
        },
      ];

      const jobProfile = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C651536 create job profile ${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.then(() => {
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            collectionOfProfiles[1].mappingProfile.permanentLoanType = res[0].name;
          });
          cy.getDefaultMaterialType().then((matType) => {
            collectionOfProfiles[1].mappingProfile.materialType = matType.name;
          });
          cy.getLocations({ query: `name="${testData.location}"` }).then((location) => {
            collectionOfProfiles[0].mappingProfile.permanentLocation = `${location.name} (${location.code})`;
          });
          ActionProfiles.getActionProfilesViaApi({
            query: `name="${instanceActionProfileName}"`,
          }).then(({ actionProfiles }) => {
            testData.instanceActionProfileId = actionProfiles[0].id;
          });
        })
          .then(() => {
            NewFieldMappingProfile.createHoldingsMappingProfileViaApi(
              collectionOfProfiles[0].mappingProfile,
            ).then((mappingProfileResponse) => {
              NewActionProfile.createActionProfileViaApi(
                collectionOfProfiles[0].actionProfile,
                mappingProfileResponse.body.id,
              ).then((actionProfileResponse) => {
                collectionOfProfiles[0].actionProfile.id = actionProfileResponse.body.id;
              });
            });
            NewFieldMappingProfile.createItemMappingProfileViaApi(
              collectionOfProfiles[1].mappingProfile,
            )
              .then((mappingProfileResponse) => {
                NewActionProfile.createActionProfileViaApi(
                  collectionOfProfiles[1].actionProfile,
                  mappingProfileResponse.body.id,
                ).then((actionProfileResponse) => {
                  collectionOfProfiles[1].actionProfile.id = actionProfileResponse.body.id;
                });
              })
              .then(() => {
                NewJobProfile.createJobProfileWithLinkedThreeActionProfilesViaApi(
                  { name: jobProfile.profileName },
                  testData.instanceActionProfileId,
                  collectionOfProfiles[0].actionProfile.id,
                  collectionOfProfiles[1].actionProfile.id,
                );
              });
          })
          .then(() => {
            DataImport.uploadFileViaApi(
              testData.marcFilePath,
              testData.marcFileName,
              jobProfile.profileName,
            ).then((response) => {
              testData.instanceId = response[0].instance.id;
            });
          });

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory],
          );

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        Users.deleteViaApi(testData.user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        collectionOfProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
      });

      it(
        'C651536 Check "Version History" card is filled on Item record created via "Data Import" (folijet)',
        { tags: ['criticalPath', 'folijet', 'C651536'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InventoryInstance.openHoldingsAccordion(testData.location);
          InventoryInstance.openItemByBarcode('No barcode');
          ItemRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.clickCloseButton();
          ItemRecordView.openItemEditForm(testData.instanceTitle);
          ItemRecordEdit.fillItemRecordFields({ materialType: MATERIAL_TYPE_NAMES.DVD });
          ItemRecordEdit.saveAndClose();
          ItemRecordView.waitLoading();
          ItemRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: ['Material type (Edited)'],
          });
        },
      );
    });
  });
});
