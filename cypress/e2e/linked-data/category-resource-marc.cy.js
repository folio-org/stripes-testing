import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import Marigold from '../../support/fragments/linked-data/marigold';
import EditResource from '../../support/fragments/linked-data/editResource';
import ViewMarc from '../../support/fragments/linked-data/viewMarc';
import NewInstance from '../../support/fragments/linked-data/newInstance';
import { EDIT_RESOURCE_HEADINGS } from '../../support/constants';
import WorkProfileModal from '../../support/fragments/linked-data/workProfileModal';
import InstanceProfileModal from '../../support/fragments/linked-data/instanceProfileModal';
import Users from '../../support/fragments/users/users';
import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: check category resource MARC codes', () => {
  const testData = {
    uniqueWorkTitle: `Test Content type, Government publication, Intended Audience ${getRandomPostfix()}`,
    uniqueInstanceTitle: `Test Media type, Carrier type ${getRandomPostfix()}`,
    mediaTypeFirst: 'microscopic (p)',
    mediaTypeSecond: 'microform (h)',
    carrierTypeFirst: 'audio belt (sb)',
    carrierTypeSecond: 'film cassette (mf)',
    contentTypeFirst: 'cartographic moving image (crm)',
    contentTypeSecond: 'cartographic tactile image (crt)',
    governmentPublicationFirst: 'multilocal (c)',
    governmentPublicationSecond: 'local (l)',
    intendedAudienceFirst: 'general (gen)',
    intendedAudienceSecond: 'primary (pri)',
    marc336First: '$a cartographic moving image $b crm $2 rdacontent',
    marc336Second: '$a cartographic tactile image $b crt $2 rdacontent',
    marc337First: '$a microscopic $b p $2 rdamedia',
    marc337Second: '$a microform $b h $2 rdamedia',
    marc338First: '$a audio belt $b sb $2 rdacarrier',
    marc338Second: '$a film cassette $b mf $2 rdacarrier',
    workId: null,
    instanceId: null,
  };

  before('Create test data', () => {
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
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
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
    ' [User journey] Marigold - Check Government Publication, Carrier type, Media type, Intended Audience and Content type on "View MARC" page (citation)',
    { tags: ['citation', 'C468168', 'marigold'] },
    () => {
      // Create work
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.checkOptionSelected('Books');
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueWorkTitle, 'Preferred Title for Work');
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.workId = resourceId;
      });
      // Create instance with fields
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      NewInstance.addMainInstanceTitle(testData.uniqueInstanceTitle);
      EditResource.setValueForSimpleField(testData.mediaTypeFirst, 'Media type');
      EditResource.setValueForSimpleField(testData.carrierTypeFirst, 'Carrier type');
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.instanceId = resourceId;
      });
      // Add work fields
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.setValueForSimpleField(testData.contentTypeFirst, 'Content Type');
      EditResource.setValueForSimpleField(testData.governmentPublicationFirst, 'Government publication');
      EditResource.setValueForSimpleField(testData.intendedAudienceFirst, 'Intended Audience');
      EditResource.saveAndKeepEditing();
      // Review MARC
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsDataAtPosition('008', 29, 'c');
      ViewMarc.checkMarcFieldContainsDataAtPosition('008', 23, 'g');
      ViewMarc.checkMarcFieldContainsData('336', testData.marc336First);
      ViewMarc.checkMarcFieldContainsData('337', testData.marc337First);
      ViewMarc.checkMarcFieldContainsData('338', testData.marc338First);
      ViewMarc.closeMarcView();
      // Additional work field values
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.clickRepeatGroup('Content Type');
      EditResource.clickRepeatGroup('Government publication');
      EditResource.clickRepeatGroup('Intended Audience');
      EditResource.setValueForSimpleField(testData.contentTypeSecond, 'Content Type', 2);
      EditResource.setValueForSimpleField(testData.governmentPublicationSecond, 'Government publication', 2);
      EditResource.setValueForSimpleField(testData.intendedAudienceSecond, 'Intended Audience', 2);
      EditResource.saveAndKeepEditing();
      // Additional instance field values
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickRepeatGroup('Media type');
      EditResource.clickRepeatGroup('Carrier type');
      EditResource.setValueForSimpleField(testData.mediaTypeSecond, 'Media type', 2);
      EditResource.setValueForSimpleField(testData.carrierTypeSecond, 'Carrier type', 2);
      EditResource.saveAndKeepEditing();
      // Review MARC again
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsOneOfDataAtPosition('008', 29, 1, ['c', 'l']);
      ViewMarc.checkMarcFieldContainsOneOfDataAtPosition('008', 23, 1, ['g', 'b']);
      ViewMarc.checkMarcFieldContainsData('336', testData.marc336First);
      ViewMarc.checkMarcFieldContainsData('336', testData.marc336Second);
      ViewMarc.checkMarcFieldContainsData('337', testData.marc337First);
      ViewMarc.checkMarcFieldContainsData('337', testData.marc337Second);
      ViewMarc.checkMarcFieldContainsData('338', testData.marc338First);
      ViewMarc.checkMarcFieldContainsData('338', testData.marc338Second);
    }
  );
});