import TopMenu from '../../support/fragments/topMenu';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import testTypes from '../../support/dictionary/testTypes';
import features from '../../support/dictionary/features';
import permissions from '../../support/dictionary/permissions';
import { replaceByIndex } from '../../support/utils/stringTools';
import { Callout } from '../../../interactors';
import Users from '../../support/fragments/users/users';
import DevTeams from '../../support/dictionary/devTeams';
import Z3950TargetProfiles from '../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe('Manage inventory Bib records with quickMarc editor', () => {
  let userId;
  const OCLCAuthentication = '100481406/PAOLF';

  before(() => {
    cy.getAdminToken().then(() => {
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
    });
  });

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
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      cy.reload();
      InventoryActions.import();
    });
  });

  afterEach(() => {
    Users.deleteViaApi(userId);
  });

  it(
    'C353612 Verify "LDR" validation rules with invalid data for editable (06, 07) and non-editable positions when editing/deriving record (spitfire)',
    { tags: [testTypes.smoke, DevTeams.spitfire, features.quickMarcEditor] },
    () => {
      const checkLdrErrors = () => {
        const initialLDRValue = InventoryInstance.validOCLC.ldrValue;
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
              ? QuickMarcEditor.checkInitialInstance008Content()
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
    { tags: [testTypes.smoke, DevTeams.spitfire, features.quickMarcEditor] },
    () => {
      const initialLDRValue = '01677cam\\a22003974c\\4500';
      const changesIn06 = ['a', 'c', 'd', 'e', 'f', 'g', 'i', 'j', 'k', 'm', 'o', 'p', 'r', 't'];
      const changesIn07 = ['a', 'b', 'c', 'd', 'i', 'm', 's'];

      InventoryInstance.checkExpectedMARCSource();

      const checkCorrectUpdate = (subfieldIndex, values) => {
        values.forEach((specialValue) => {
          InventoryInstance.goToEditMARCBiblRecord();
          QuickMarcEditor.waitLoading();
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
