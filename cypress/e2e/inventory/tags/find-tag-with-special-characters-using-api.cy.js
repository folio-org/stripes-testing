import permissions from '../../../support/dictionary/permissions';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import Users from '../../../support/fragments/users/users';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import UserEdit from '../../../support/fragments/users/userEdit';
import { DevTeams } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InteractorsTools from '../../../support/utils/interactorsTools';

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
    'test',
    'tag_test',
    'tag,test',
    "tag's",
    'tag50%',
    'tag^one',
    '{tag}',
    '(tags)',
    '[tags]test',
    '@tag',
    'money$tag',
    'hashtag#tag',
    'tag&tags',
    'tag+tag-tag=0',
    'tag;',
    'tag.',
    'ohtag!',
    'really?',
    '"tags"',
    'tag/nottag',
    'tag\\hmm',
    'new*tag',
  ];
  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
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
        cy.createTempUser([permissions.inventoryAll.gui, permissions.uiTagsPermissionAll.gui]).then(
          (userProperties) => {
            userData = userProperties;
            UserEdit.addServicePointViaApi(
              testData.userServicePoint.id,
              userData.userId,
              testData.userServicePoint.id,
            );
          },
        );
      })
      .then(() => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
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
    { tags: [TestTypes.extendedPath, DevTeams.volaris] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(instanceData.title);
      InventorySearchAndFilter.selectFoundInstance(instanceData.title);
      InventorySearchAndFilter.verifyInstanceDetailsView();
      InventorySearchAndFilter.openTagsField();
      InventorySearchAndFilter.verifyTagsView();
      newTags.forEach((tag) => {
        InventorySearchAndFilter.addTag(tag);
        InteractorsTools.checkCalloutMessage('New tag created');
        cy.wait(2000);
      });

      newTags[newTags.indexOf('"tags"')] = '\\"tags\\"';
      newTags[newTags.indexOf('tag\\hmm')] = 'tag\\\\hmm';
      newTags.forEach((tag) => {
        cy.getTagsApi({ query: `label=="${tag}"` }).then(({ body }) => {
          testData.newTagsIds.push(body.tags[0].id);
        });
      });
    },
  );
});
