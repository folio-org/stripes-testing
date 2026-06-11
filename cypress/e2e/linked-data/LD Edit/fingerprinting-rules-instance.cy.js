import { EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

import EditResource from '../../../support/fragments/linked-data/editResource';
import InstanceProfileModal from '../../../support/fragments/linked-data/instanceProfileModal';
import Marigold from '../../../support/fragments/linked-data/marigold';
import Work from '../../../support/fragments/linked-data/work';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';

import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: Fingerprinting rules for Instance', () => {
  const testData = {
    workId: null,
    resourceTitle: `Data Science in Practice ${getRandomPostfix()}`,
    otherTitleInfo: 'methods, tools, and real-world applications',
    editionStatement: '2nd revised and expanded edition',
    updatedEditionStatement: '3rd revised and expanded edition',
    provisionActivityName: 'Academic Press',
    updatedProvisionActivityName: 'New Academic Press',
    provisionActivityEdtfDate: '2023',
    provisionActivityDate: '2023',
    searchPlaceOfPublication: 'England',
    provisionActivityPlace: 'London',
    isbnNumber: '9780128234567',
    isbnQualifier: 'hardcover',
    updatedIsbnQualifier: 'paperback',
    updatedIsbn: '9780128234568',
    modeOfIssuance: 'serial (serl)',
  };

  before('Create test user', () => {
    cy.getAdminToken();
    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
      cy.assignCapabilitiesToExistingUser(
        user.userId,
        MARIGOLD_CAPABILITIES,
        MARIGOLD_CAPABILITY_SETS,
      );
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Work.getInstancesByTitle(testData.resourceTitle).then((instances) => {
      instances.forEach((instance) => {
        Work.deleteById(instance.id);
      });
    });
    if (testData.workId) Work.deleteById(testData.workId);
    Users.deleteViaApi(user.userId);
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.linkedDataEditor,
      waiter: Marigold.waitLoading,
      authRefresh: true,
    });
  });

  it(
    'C1282818 - Update fingerprinting rules for Instance (citation)',
    { tags: ['criticalPath', 'citation', 'C1282818', 'marigold'] },
    () => {
      let currentInstanceId;

      // Create Work (Books profile)
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.resourceTitle, 'Preferred Title for Work');
      EditResource.setValueForTheField(testData.otherTitleInfo, 'Other title information');
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.workId = resourceId;
      });

      // Create Instance (Monograph profile)
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      EditResource.setValueForTheField(testData.resourceTitle, 'Main Title');
      EditResource.setValueForTheField(testData.otherTitleInfo, 'Other Title Information');
      EditResource.setEdition(testData.editionStatement);
      EditResource.setValueForSectionField(
        testData.provisionActivityEdtfDate,
        'EDTF Date',
        'Provision Activity',
      );
      EditResource.setValueForSearchableSimpleField(
        testData.searchPlaceOfPublication,
        'Search place of publication',
      );
      EditResource.setValueForSectionField(
        testData.provisionActivityPlace,
        'Place',
        'Provision Activity',
      );
      EditResource.setValueForSectionField(
        testData.provisionActivityName,
        'Name',
        'Provision Activity',
      );
      EditResource.setValueForSectionField(
        testData.provisionActivityDate,
        'Date',
        'Provision Activity',
      );
      EditResource.clickRepeatGroup('Identifiers');
      EditResource.addIsbnIdentifier(testData.isbnNumber, testData.isbnQualifier);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.instanceId = resourceId;
        currentInstanceId = resourceId;
      });
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);

      // Step 1: Mode of Issuance change does NOT affect instance ID
      EditResource.setModeOfIssuance(testData.modeOfIssuance);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        expect(resourceId).to.equal(currentInstanceId);
        currentInstanceId = resourceId;
      });

      // Step 2: Provision Activity Name change DOES affect instance ID
      EditResource.setValueForSectionField(
        testData.updatedProvisionActivityName,
        'Name',
        'Provision Activity',
      );
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        expect(resourceId).to.not.equal(currentInstanceId);
        currentInstanceId = resourceId;
      });

      // Step 3: Edition Statement change DOES affect instance ID
      EditResource.setEdition(testData.updatedEditionStatement);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        expect(resourceId).to.not.equal(currentInstanceId);
        currentInstanceId = resourceId;
      });

      // Step 4: ISBN Qualifier change DOES affect instance ID
      EditResource.changeIdentifierQualifier(testData.updatedIsbnQualifier);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        expect(resourceId).to.not.equal(currentInstanceId);
        currentInstanceId = resourceId;
      });

      // Step 5: ISBN Number change DOES affect instance ID
      EditResource.changeIdentifierValue(testData.updatedIsbn);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        expect(resourceId).to.not.equal(currentInstanceId);
      });
    },
  );
});
