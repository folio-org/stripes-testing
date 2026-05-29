import { DEFAULT_JOB_PROFILE_NAMES, EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

import EditResource from '../../../support/fragments/linked-data/editResource';
import InstanceProfileModal from '../../../support/fragments/linked-data/instanceProfileModal';
import Marigold from '../../../support/fragments/linked-data/marigold';
import NewInstance from '../../../support/fragments/linked-data/newInstance';
import PreviewResource from '../../../support/fragments/linked-data/previewResource';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import ViewMarc from '../../../support/fragments/linked-data/viewMarc';
import Work from '../../../support/fragments/linked-data/work';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';

import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: check category resource MARC codes', () => {
  const testData = {
    workId: null,
    instanceId: null,
    marcFilePath: 'marcFileForC468168.mrc',
    modifiedMarcFile: `C468168 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C468168 marcFile${getRandomPostfix()}.mrc`,
    uniqueGeoDateWorkTitle: `Test Geographic coverage / Date of Work ${getRandomPostfix()}`,
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
  };

  const resourceData = {
    geoDateWorkTitle: testData.uniqueGeoDateWorkTitle,
    dateOfWork: '1998',
    geographicCoverage: 'Yellow River (China)',
    marc336First: '$a cartographic moving image $b crm $2 rdacontent',
    marc336Second: '$a cartographic tactile image $b crt $2 rdacontent',
    marc337First: '$a microscopic $b p $2 rdamedia',
    marc337Second: '$a microform $b h $2 rdamedia',
    marc338First: '$a audio belt $b sb $2 rdacarrier',
    marc338Second: '$a film cassette $b mf $2 rdacarrier',
    marc043: '$a a-ccy',
    marc046: '$k 1998',
  };

  before('Create test data', () => {
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.modifiedMarcFile,
      ['Placeholder Title'],
      [testData.uniqueGeoDateWorkTitle],
    );
    cy.getAdminToken();

    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
      cy.assignCapabilitiesToExistingUser(
        user.userId,
        MARIGOLD_CAPABILITIES,
        MARIGOLD_CAPABILITY_SETS,
      );
    });

    DataImport.uploadFileViaApi(
      testData.modifiedMarcFile,
      testData.marcFileName,
      DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    );
  });

  after('Delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
    cy.getAdminToken();
    InventoryInstances.deleteFullInstancesByTitleViaApi(resourceData.geoDateWorkTitle);
    Work.getInstancesByTitle(resourceData.geoDateWorkTitle).then((instances) => {
      const filteredInstances = instances.filter(
        (element) => element.titles[0].value === resourceData.geoDateWorkTitle,
      );
      Work.deleteById(filteredInstances[0].id);
    });
    Work.getIdByTitle(resourceData.geoDateWorkTitle).then((id) => Work.deleteById(id));
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
    if (testData.workId) Work.deleteById(testData.workId);
    Users.deleteViaApi(user.userId);
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
      authRefresh: true,
    });
  });

  it(
    'C468168 Marigold - Check Government Publication, Carrier type, Media type, Intended Audience, Content type, Geographic coverage, and Date of Work on "View MARC" page',
    { tags: ['criticalPath', 'citation', 'C468168', 'marigold'] },
    () => {
      InventoryInstances.searchByTitle(testData.uniqueGeoDateWorkTitle);
      InventoryInstance.editInstanceInMG();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickCloseResourceButton();

      // Create work
      Marigold.waitLoading();
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.checkOptionSelected('Books');
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueWorkTitle, 'Preferred Title for Work');
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.workId = resourceId;
      });

      // Create instance
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      NewInstance.addMainInstanceTitle(testData.uniqueInstanceTitle);
      EditResource.saveAndKeepEditing();

      // Add instance fields
      EditResource.setValueForSimpleField(testData.mediaTypeFirst, 'Media type');
      EditResource.setValueForSimpleField(testData.carrierTypeFirst, 'Carrier type');
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.instanceId = resourceId;
      });

      // Add work fields
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.setValueForSimpleField(testData.contentTypeFirst, 'Content Type');
      EditResource.setValueForSimpleField(
        testData.governmentPublicationFirst,
        'Government publication',
      );
      EditResource.setValueForSimpleField(testData.intendedAudienceFirst, 'Intended Audience');
      EditResource.saveAndKeepEditing();

      // Review MARC
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsDataAtPosition('008', 29, 'c');
      ViewMarc.checkMarcFieldContainsDataAtPosition('008', 23, 'g');
      ViewMarc.checkMarcFieldContainsData('336', resourceData.marc336First);
      ViewMarc.checkMarcFieldContainsData('337', resourceData.marc337First);
      ViewMarc.checkMarcFieldContainsData('338', resourceData.marc338First);
      ViewMarc.closeMarcView();

      // Additional work field values
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.clickRepeatGroup('Content Type');
      EditResource.clickRepeatGroup('Government publication');
      EditResource.clickRepeatGroup('Intended Audience');
      EditResource.setValueForSimpleField(testData.contentTypeSecond, 'Content Type', 2);
      EditResource.setValueForSimpleField(
        testData.governmentPublicationSecond,
        'Government publication',
        2,
      );
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
      ViewMarc.checkMarcFieldContainsData('336', resourceData.marc336First);
      ViewMarc.checkMarcFieldContainsData('336', resourceData.marc336Second);
      ViewMarc.checkMarcFieldContainsData('337', resourceData.marc337First);
      ViewMarc.checkMarcFieldContainsData('337', resourceData.marc337Second);
      ViewMarc.checkMarcFieldContainsData('338', resourceData.marc338First);
      ViewMarc.checkMarcFieldContainsData('338', resourceData.marc338Second);
      ViewMarc.closeMarcView();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickCloseResourceButton();

      // Review precondition work
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.geoDateWorkTitle);
      SearchAndFilter.checkSearchResultsByTitle(resourceData.geoDateWorkTitle);
      Marigold.clickEditWorkFromSearch();
      EditResource.checkTextValueOnField(resourceData.dateOfWork, 'Date of Work');
      EditResource.checkTextValueOnDisabledField(
        resourceData.geographicCoverage,
        'Search LCNAF, LCSH or GAC',
      );

      // Review precondition work's MARC
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsData('043', resourceData.marc043);
      ViewMarc.checkMarcFieldContainsData('046', resourceData.marc046);
    },
  );
});
