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
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ActionProfiles from '../../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      let user;
      const randomPostfix = getRandomPostfix();
      const instanceTitle = 'AT_C808507_MarcBibInstance';
      const filePath = 'marcBibFileC808507.mrc';
      const nameMarcFileForImportCreate = `C808507 autotestFileForCreate_${randomPostfix}.mrc`;
      const nameMarcFileForImportUpdate = `C808507 autotestFileForUpdate_${randomPostfix}.mrc`;
      const instanceActionProfileName = 'Default - Create instance';
      const itemBarcode = 'c808507autotestitembarcode';
      const newItemOrder = 3;
      // profiles for creating holdings, item
      const collectionOfProfilesForCreate = [
        {
          mappingProfile: {
            name: `C808507 holdings mapping profile_${randomPostfix}`,
            permanentLocation: LOCATION_NAMES.ONLINE,
            pernanentLocationUI: LOCATION_NAMES.ONLINE_UI,
          },
          actionProfile: {
            name: `C808507 holdings action profile_${randomPostfix}`,
            action: 'CREATE',
            folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          },
        },
        {
          mappingProfile: {
            name: `C808507 item mapping profile_${randomPostfix}`,
            materialType: null,
            permanentLoanType: null,
            status: ITEM_STATUS_NAMES.AVAILABLE,
          },
          actionProfile: {
            name: `C808507 item action profile_${randomPostfix}`,
            action: 'CREATE',
            folioRecordType: EXISTING_RECORD_NAMES.ITEM,
          },
        },
      ];
      // profiles for updating item
      const collectionOfProfilesForUpdate = {
        actionProfile: {
          folioRecordType: EXISTING_RECORD_NAMES.ITEM,
          name: `C808507 autotestActionItemUpdate_${randomPostfix}`,
          action: 'UPDATE',
        },
        matchProfile: {
          profileName: `C808507 autotestMatchItemUpdate_${randomPostfix}`,
          incomingRecordFields: {
            field: '949',
            in1: ' ',
            in2: ' ',
            subfield: 'a',
          },
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          existingRecordType: EXISTING_RECORD_NAMES.ITEM,
          existingMatchExpressionValue: 'item.barcode',
        },
      };
      const jobProfileForCreate = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C808507 create job profile ${randomPostfix}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };
      const jobProfileForUpdate = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C808507 update job profile ${randomPostfix}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      let instanceActionProfileId;
      let mappingItemProfileId;
      let createdInstanceId;
      let createdHoldingsId;
      let createdItemId;

      before('Create test data and login', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C808507');

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
                mappingItemProfileId = mappingProfileResponse.body.id;
                NewActionProfile.createActionProfileViaApi(
                  collectionOfProfilesForCreate[1].actionProfile,
                  mappingItemProfileId,
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
            NewActionProfile.createActionProfileViaApi(
              collectionOfProfilesForUpdate.actionProfile,
              mappingItemProfileId,
            ).then((actionProfileResponse) => {
              NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(
                collectionOfProfilesForUpdate.matchProfile,
              ).then((matchProfileResponse) => {
                NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                  jobProfileForUpdate.profileName,
                  matchProfileResponse.body.id,
                  actionProfileResponse.body.id,
                );
              });
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
          })
          .then(() => {
            cy.getToken(user.username, user.password);

            DataImport.uploadFileViaApi(
              filePath,
              nameMarcFileForImportCreate,
              jobProfileForCreate.profileName,
            ).then((response) => {
              createdInstanceId = response[0].instance.id;
              createdHoldingsId = response[0].holding.id;
              createdItemId = response[0].item.id;

              cy.getItems({ query: `id=="${createdItemId}"` }).then((item) => {
                const updatedItemBody = {
                  ...item,
                  order: newItemOrder,
                  barcode: itemBarcode,
                };
                InventoryItems.editItemViaApi(updatedItemBody);
              });
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.profileName);
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
          collectionOfProfilesForCreate.forEach((profile) => {
            SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
            SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
              profile.mappingProfile.name,
            );
          });
          SettingsActionProfiles.deleteActionProfileByNameViaApi(
            collectionOfProfilesForUpdate.actionProfile.name,
          );
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(
            collectionOfProfilesForUpdate.matchProfile.profileName,
          );
        });
      });

      it(
        'C808507 Update "Item" record via "Data import" and check "order" field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C808507'] },
        () => {
          DataImport.uploadFileViaApi(
            filePath,
            nameMarcFileForImportUpdate,
            jobProfileForUpdate.profileName,
          ).then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });

            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            InventoryInstance.openHoldingsAccordion('Holdings: ');
            InventoryInstance.verifyItemBarcode(itemBarcode);

            InventoryItems.getItemsInHoldingsViaApi(createdHoldingsId).then((items) => {
              const orderValues = items.map((itm) => itm.order);
              expect(orderValues).to.deep.equal([newItemOrder]);
            });
          });
        },
      );
    });
  });
});
