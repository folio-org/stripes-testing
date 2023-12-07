import TopMenu from '../../support/fragments/topMenu';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import features from '../../support/dictionary/features';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix, { replaceByIndex } from '../../support/utils/stringTools';
import { Callout } from '../../../interactors';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../support/constants';

describe('Manage inventory Bib records with quickMarc editor', () => {
  let userId;
  let instanceId;

  const marcFile = {
    marc: 'oneMarcBib.mrc',
    fileNamePrefix: 'testMarcFileLDR',
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    ldrValue: '01222nam\\a22002773c\\4500',
    tag008BytesProperties: [
      { key: 'srce', value: '|' },
      { key: 'lang', value: 'mul' },
      { key: 'form', value: '\\' },
      { key: 'ctry', value: '|||' },
      { key: 'dtSt', value: '|' },
      { key: 'startDate', value: '2016' },
      { key: 'endDate', value: '||||' },
    ],
  };

  beforeEach(() => {
    cy.createTempUser([
      permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.converterStorageAll.gui,
    ]).then((userProperties) => {
      userId = userProperties.userId;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        const fileName = `${marcFile.fileNamePrefix}${getRandomPostfix()}.mrc`;
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, fileName);
        JobProfiles.waitLoadingList();
        //  wait for a file to be fully loaded
        cy.wait(3000);
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        Logs.getCreatedItemsID().then((link) => {
          instanceId = link.split('/')[5];
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstance.searchByTitle(instanceId);
          InventoryInstances.selectInstance();
        });
      });
    });
  });

  afterEach(() => {
    cy.getAdminToken();
    InventoryInstance.deleteInstanceViaApi(instanceId);
    Users.deleteViaApi(userId);
    instanceId = '';
  });

  it(
    'C353612 Verify "LDR" validation rules with invalid data for editable (06, 07) and non-editable positions when editing/deriving record (spitfire)',
    { tags: ['smoke', 'spitfire', features.quickMarcEditor] },
    () => {
      const checkLdrErrors = () => {
        const initialLDRValue = marcFile.ldrValue;
        const positions6Error =
          'Record cannot be saved. Please enter a valid Leader 06. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html';
        const position7Error =
          'Record cannot be saved. Please enter a valid Leader 07. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html';
        const positions6And7Error =
          'Record cannot be saved. Please enter a valid Leader 06 and Leader 07. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html';
        const readOnlyPositionsError =
          'Record cannot be saved. Please check the Leader. Only positions 5, 6, 7, 8, 17, 18 and/or 19 can be edited in the Leader.';

        const changedLDRs = [
          {
            newContent: replaceByIndex(replaceByIndex(initialLDRValue, 6, 'h'), 7, 'm'),
            errorMessage: positions6Error,
            is008presented: false,
          },
          {
            newContent: replaceByIndex(replaceByIndex(initialLDRValue, 6, 'p'), 7, 'g'),
            errorMessage: position7Error,
            is008presented: true,
          },
          {
            newContent: replaceByIndex(replaceByIndex(initialLDRValue, 6, 'a'), 7, 'g'),
            errorMessage: position7Error,
            is008presented: false,
          },
          {
            newContent: replaceByIndex(replaceByIndex(initialLDRValue, 6, '1'), 7, '$'),
            errorMessage: positions6And7Error,
            is008presented: false,
          },
          {
            newContent: replaceByIndex(initialLDRValue, 1, 'z'),
            errorMessage: readOnlyPositionsError,
            is008presented: true,
          },
          {
            newContent: replaceByIndex(initialLDRValue, 4, 'z'),
            errorMessage: readOnlyPositionsError,
            is008presented: true,
          },
          {
            newContent: replaceByIndex(initialLDRValue, 9, 'z'),
            errorMessage: readOnlyPositionsError,
            is008presented: true,
          },
          {
            newContent: replaceByIndex(initialLDRValue, 16, 'z'),
            errorMessage: readOnlyPositionsError,
            is008presented: true,
          },
          {
            newContent: replaceByIndex(initialLDRValue, 20, 'z'),
            errorMessage: readOnlyPositionsError,
            is008presented: true,
          },
          {
            newContent: replaceByIndex(initialLDRValue, 23, 'z'),
            errorMessage: readOnlyPositionsError,
            is008presented: true,
          },
        ];

        changedLDRs.forEach((changedLDR) => {
          QuickMarcEditor.updateExistingField('LDR', changedLDR.newContent);
          cy.wrap(QuickMarcEditor.pressSaveAndClose()).then(() => {
            cy.expect(Callout(changedLDR.errorMessage).exists());
            cy.do(Callout(changedLDR.errorMessage).dismiss());
            cy.expect(Callout(changedLDR.errorMessage).absent());
            // eslint-disable-next-line no-unused-expressions
            changedLDR.is008presented
              ? QuickMarcEditor.check008FieldsContent(marcFile.tag008BytesProperties)
              : QuickMarcEditor.checkEmptyContent('008');
          });
        });
      };

      InventoryInstance.checkExpectedMARCSource();
      InventoryInstance.goToEditMARCBiblRecord();
      QuickMarcEditor.waitLoading();
      cy.reload();
      checkLdrErrors();
      QuickMarcEditor.closeWithoutSavingAfterChange();
      InventoryInstance.deriveNewMarcBib();
      QuickMarcEditor.check008FieldsAbsent('Type', 'Blvl');
      checkLdrErrors();
    },
  );

  it(
    'C353610 Verify "LDR" validation rules with valid data for positions 06 and 07 when editing record (spitfire)',
    { tags: ['smoke', 'spitfire', features.quickMarcEditor] },
    () => {
      const initialLDRValue = marcFile.ldrValue;
      const changesIn06 = ['c', 'd', 'e', 'f', 'g', 'i', 'j', 'k', 'm', 'o', 'p', 'r', 't'];
      const changesIn07 = ['a', 'b', 'c', 'd', 'i', 's'];

      InventoryInstance.checkExpectedMARCSource();

      const checkCorrectUpdate = (subfieldIndex, values) => {
        values.forEach((specialValue) => {
          InventoryInstance.goToEditMARCBiblRecord();
          QuickMarcEditor.waitLoading();
          // without wait sometimes record cannot be saved - possibly backend is not ready
          cy.wait(2000);
          QuickMarcEditor.updateExistingField(
            'LDR',
            replaceByIndex(initialLDRValue, subfieldIndex, specialValue),
          );
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.pressSaveAndClose();
          InventoryInstance.waitLoading();
        });
      };

      checkCorrectUpdate(6, changesIn06);
      checkCorrectUpdate(7, changesIn07);
    },
  );
});
