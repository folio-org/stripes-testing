import permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Tags', () => {
    let userData;
    const testData = {
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      newTagsIds: [],
    };
    const instanceData = {
      title: getTestEntityValue('InstanceStaffSlips'),
    };
    const newTags = [
      'atest',
      'atag_test',
      'atag,test',
      "atag's",
      'atag50%',
      'atag^one',
      '{atag}',
      '(atags)',
      '[atags]test',
      '@atag',
      'money$atag',
      'hashtag#atag',
      'atag&tags',
      'atag+tag-tag=0',
      'atag;',
      'atag.',
      'ohatag!',
      'really?',
      '"atags"',
      'atag/nottag',
      'atag\\hmm',
      'new*atag',
    ];
    before('Preconditions', () => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.createViaApi(testData.userServicePoint);
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.wrap([...newTags, '\\"atags\\"', 'atag\\\\hmm']).each((tag) => {
            cy.getTagsApi({ query: `label=="${tag}"` }).then(({ body }) => {
              if (body.tags) {
                cy.deleteTagApi(body.tags[0].id);
              }
            });
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: instanceData.title,
            },
          }).then((specialInstanceIds) => {
            instanceData.instanceId = specialInstanceIds.instanceId;
          });
        })
        .then(() => {
          cy.createTempUser([
            permissions.inventoryAll.gui,
            permissions.uiTagsPermissionAll.gui,
          ]).then((userProperties) => {
            userData = userProperties;
            UserEdit.addServicePointViaApi(
              testData.userServicePoint.id,
              userData.userId,
              testData.userServicePoint.id,
            );
          });
        })
        .then(() => {
          cy.waitForAuthRefresh(() => {
            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      testData.newTagsIds.forEach((id) => {
        cy.deleteTagApi(id);
      });
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      Users.deleteViaApi(userData.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceData.instanceId);
    });

    it(
      'C380422 Find Tag with special characters using API (volaris)',
      { tags: ['extendedPath', 'volaris', 'C380422', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(instanceData.title);
        InventorySearchAndFilter.verifySearchResult(instanceData.title);
        InventorySearchAndFilter.selectFoundInstance(instanceData.title);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
        newTags.forEach((tag) => {
          InventorySearchAndFilter.addTag(tag);
          InteractorsTools.checkCalloutMessage('New tag created');
          cy.wait(3000);
          InventorySearchAndFilter.closeTagsPane();
          InventorySearchAndFilter.openTagsField();
        });

        newTags[newTags.indexOf('"atags"')] = '\\"atags\\"';
        newTags[newTags.indexOf('atag\\hmm')] = 'atag\\\\hmm';
        newTags.forEach((tag) => {
          cy.getAdminToken();
          cy.getTagsApi({ query: `label=="${tag}"` }).then(({ body }) => {
            testData.newTagsIds.push(body.tags[0].id);
          });
        });
      },
    );
  });
});
