import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ActionProfiles from '../../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      let user;
      const instanceTitle = 'AT_C808505_MarcBibInstance';
      const filePath = 'marcBibC808505.mrc';
      const nameMarcFileForImportCreate = `C808505 autotestFileForCreate${getRandomPostfix()}.mrc`;
      const instanceActionProfileName = 'Default - Create instance';
      // profiles for creating holdings, item
      const collectionOfProfilesForCreate = [
        {
          mappingProfile: {
            name: `C808505 holdings mapping profile${getRandomPostfix()}`,
            permanentLocation: LOCATION_NAMES.ONLINE,
            pernanentLocationUI: LOCATION_NAMES.ONLINE_UI,
          },
          actionProfile: {
            name: `C808505 holdings action profile${getRandomPostfix()}`,
            action: 'CREATE',
            folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          },
        },
        {
          mappingProfile: {
            name: `C808505 item mapping profile${getRandomPostfix()}`,
            materialType: null,
            permanentLoanType: null,
            status: ITEM_STATUS_NAMES.AVAILABLE,
          },
          actionProfile: {
            name: `C808505 item action profile${getRandomPostfix()}`,
            action: 'CREATE',
            folioRecordType: EXISTING_RECORD_NAMES.ITEM,
          },
        },
      ];

      const jobProfileForCreate = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C808505 create job profile ${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      let instanceActionProfileId;
      let createdInstanceId;
      let createdHoldingsId;

      before('Create test data and login', () => {
        cy.getAdminToken();
        cy.then(() => {
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            collectionOfProfilesForCreate[1].mappingProfile.permanentLoanType = res[0].name;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
            collectionOfProfilesForCreate[1].mappingProfile.materialType = matType.name;
          });
          ActionProfiles.getActionProfilesViaApi({
            query: `name="${instanceActionProfileName}"`,
          }).then(({ actionProfiles }) => {
            instanceActionProfileId = actionProfiles[0].id;
          });
        })
          .then(() => {
            NewFieldMappingProfile.createHoldingsMappingProfileViaApi(
              collectionOfProfilesForCreate[0].mappingProfile,
            ).then((mappingProfileResponse) => {
              NewActionProfile.createActionProfileViaApi(
                collectionOfProfilesForCreate[0].actionProfile,
                mappingProfileResponse.body.id,
              ).then((actionProfileResponse) => {
                collectionOfProfilesForCreate[0].actionProfile.id = actionProfileResponse.body.id;
              });
            });
            NewFieldMappingProfile.createItemMappingProfileViaApi(
              collectionOfProfilesForCreate[1].mappingProfile,
            )
              .then((mappingProfileResponse) => {
                NewActionProfile.createActionProfileViaApi(
                  collectionOfProfilesForCreate[1].actionProfile,
                  mappingProfileResponse.body.id,
                ).then((actionProfileResponse) => {
                  collectionOfProfilesForCreate[1].actionProfile.id = actionProfileResponse.body.id;
                });
              })
              .then(() => {
                NewJobProfile.createJobProfileWithLinkedThreeActionProfilesViaApi(
                  { name: jobProfileForCreate.profileName },
                  instanceActionProfileId,
                  collectionOfProfilesForCreate[0].actionProfile.id,
                  collectionOfProfilesForCreate[1].actionProfile.id,
                );
              });
          })
          .then(() => {
            cy.getAdminToken();
            cy.createTempUser([
              Permissions.moduleDataImportEnabled.gui,
              Permissions.settingsDataImportEnabled.gui,
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiInventoryViewCreateEditItems.gui,
            ]).then((userProperties) => {
              user = userProperties;
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.profileName);
          collectionOfProfilesForCreate.forEach((profile) => {
            SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
            SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
              profile.mappingProfile.name,
            );
          });
        });
      });

      it(
        'C808505 Import "Item" record and check "order" field (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C808505'] },
        () => {
          cy.getToken(user.username, user.password);

          DataImport.uploadFileViaApi(
            filePath,
            nameMarcFileForImportCreate,
            jobProfileForCreate.profileName,
          ).then((response) => {
            createdInstanceId = response[0].instance.id;
            createdHoldingsId = response[0].holding.id;

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });

            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();

            InventoryInstance.openHoldingsAccordion('Holdings: ');

            InventoryItems.getItemsInHoldingsViaApi(createdHoldingsId).then((items) => {
              expect(items).to.have.length(1);
              expect(items[0].order).to.equal(1);
            });
          });
        },
      );
    });
  });
});
