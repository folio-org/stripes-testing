import {
  Button,
  Callout,
  DropdownMenu,
  HTML,
  Modal,
  MultiColumnListHeader,
  PaneHeader,
  QuickMarcEditorRow,
  Section,
  Select,
  Spinner,
  TableCell,
  TableRow,
  TextArea,
  TextField,
  Tooltip,
  including,
  matching,
  not,
  or,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import QuickMarcEditorWindow from '../quickMarcEditor';

const defaultUpdateJobProfile = 'Update authority by matching 010';
const rootSection = Section({ id: 'marc-view-pane' });
const rootHeader = rootSection.find(PaneHeader());

const buttonClose = rootHeader.find(Button({ icon: 'times' }));
const addFieldButton = Button({ ariaLabel: 'plus-sign' });
const deleteFieldButton = Button({ ariaLabel: 'trash' });
const infoButton = Button({ ariaLabel: 'info' });
const saveAndCloseButton = Button({ id: 'quick-marc-record-save' });
const continueWithSaveButton = Modal().find(
  Button({ id: 'clickable-quick-marc-confirm-modal-confirm' }),
);
const buttonLink = Button({ icon: 'unlink' });
const calloutCreatedRecordSuccess = Callout('Record created.');
const calloutUpdatedRecordSuccess = Callout(
  'This record has successfully saved and is in process. Changes may not appear immediately.',
);
const searchPane = Section({ id: 'pane-authorities-filters' });
const closeButton = Button({ icon: 'times' });
const sourceFileSelect = QuickMarcEditorRow({ tagValue: '001' }).find(
  Select('Authority file name'),
);
const versionHistoryButton = Button({ icon: 'clock' });
const versionHistoryToolTipText = 'Version history';
const actionsButton = rootSection.find(Button('Actions', { disabled: or(true, false) }));

// related with cypress\fixtures\oneMarcAuthority.mrc
const defaultAuthority = {
  id: '176116217',
  // TODO: hardcoded count related with interactors getters issue. Redesign to cy.then(QuickMarkEditor().rowsCount()).then(rowsCount => {...}
  lastRowNumber: 18,
  // it should be presented in marc authority one time to correct work(applicable in update of record)
  existingTag: '380',
  headingReference: 'Congress and foreign policy series',
  // related with presence of 130 tag, see https://issues.folio.org/browse/MODQM-159
  headingType: 'Uniform title',
  status: 'Current',
  name: 'oneMarcAuthority.mrc',
  tag008AuthorityBytesProperties: {
    geoSubd: { interactor: Select('Geo Subd'), defaultValue: 'n - Not applicable', newValue: 'v' },
    roman: {
      interactor: Select(or('Roman', 'Roman*')),
      defaultValue: '| - No attempt to code',
      newValue: 'v',
    },
    lang: {
      interactor: Select('Lang'),
      defaultValue: '\\ - No information provided',
      newValue: 'v',
    },
    kindRec: {
      interactor: Select(or('Kind rec', 'Kind rec*')),
      defaultValue: 'a - Established heading',
      newValue: 'v',
    },
    catRules: {
      interactor: Select(or('CatRules', 'CatRules*')),
      defaultValue: 'c - AACR 2',
      newValue: 'v',
    },
    sHSys: {
      interactor: Select(or('SH Sys', 'SH Sys*')),
      defaultValue: 'a - Library of Congress Subject Headings',
      newValue: 'v',
    },
    series: {
      interactor: Select(or('Series', 'Series*')),
      defaultValue: 'n - Not applicable',
      newValue: 'v',
    },
    numbSeries: {
      interactor: Select(or('Numb Series', 'Numb Series*')),
      defaultValue: 'n - Not applicable',
      newValue: 'v',
    },
    mainUse: {
      interactor: Select(or('Main use', 'Main use*')),
      defaultValue: 'a - Appropriate',
      newValue: 'v',
    },
    subjUse: {
      interactor: Select(or('Subj use', 'Subj use*')),
      defaultValue: 'a - Appropriate',
      newValue: 'v',
    },
    seriesUse: {
      interactor: Select(or('Series use', 'Series use*')),
      defaultValue: 'a - Appropriate',
      newValue: 'v',
    },
    subdType: {
      interactor: Select(or('Subd type', 'Subd type*')),
      defaultValue: 'n - Not applicable',
      newValue: 'v',
    },
    govtAg: {
      interactor: Select('Govt Ag'),
      defaultValue: '| - No attempt to code',
      newValue: 'v',
    },
    refEval: {
      interactor: Select(or('RefEval', 'RefEval*')),
      defaultValue: 'a - Tracings are consistent with the heading',
      newValue: 'v',
    },
    recUpd: {
      interactor: Select(or('RecUpd', 'RecUpd*')),
      defaultValue: 'a - Record can be used',
      newValue: 'v',
    },
    persName: {
      interactor: Select(or('Pers Name', 'Pers Name*')),
      defaultValue: 'a - Differentiated personal name',
      newValue: 'v',
    },
    levelEst: {
      interactor: Select(or('Level Est', 'Level Est*')),
      defaultValue: 'a - Fully established',
      newValue: 'v',
    },
    modRec: {
      interactor: Select('Mod Rec'),
      defaultValue: '\\ - Not modified',
      newValue: 'v',
    },
    source: {
      interactor: Select('Source'),
      defaultValue: '\\ - National bibliographic agency',
      newValue: 'v',
    },
    getAllProperties: () => {
      return Object.values(defaultAuthority.tag008AuthorityBytesProperties).filter(
        (objectProperty) => typeof objectProperty !== 'function',
      );
    },
    convertToSource: (properties) => {
      const changedProperties = [...properties];
      changedProperties.splice(12, 0, '          ');
      changedProperties.splice(15, 0, ' ');
      changedProperties.splice(19, 0, '    ');
      return changedProperties;
    },
    getNewValueSourceLine: () => defaultAuthority.tag008AuthorityBytesProperties
      .convertToSource(
        defaultAuthority.tag008AuthorityBytesProperties
          .getAllProperties()
          .map((property) => property.newValue),
      )
      .join(''),
  },
  // 24 symbols
  ldrValue: '00846cz\\\\a2200241n\\\\4500',
};

const detailsPaneHeader = PaneHeader({ id: 'paneHeadermarc-view-pane' });
const langOptions = {
  '\\': '\\ - No information provided',
  b: 'b - English and French',
  e: 'e - English only',
  f: 'f - French only',
  '|': '| - No attempt to code',
};

export default {
  defaultAuthority,
  defaultUpdateJobProfile,
  waitLoading: () => cy.expect(rootSection.exists()),
  edit: () => {
    cy.do(actionsButton.click());
    cy.do(Button('Edit').click());
    QuickMarcEditorWindow.waitLoading();
  },
  delete: () => {
    cy.do(actionsButton.click());
    cy.do(Button('Delete').click());
  },
  exportMarc: () => {
    cy.do(actionsButton.click());
    cy.do(Button('Export (MARC)').click());
  },
  contains: (expectedText, { regexp = false } = {}) => {
    if (regexp) cy.expect(rootSection.find(HTML(matching(new RegExp(expectedText)))).exists());
    else cy.expect(rootSection.find(HTML(including(expectedText))).exists());
  },
  notContains: (expectedText) => cy.expect(rootSection.find(HTML(including(expectedText))).absent()),
  checkTagInRow: (rowIndex, tag) => {
    cy.expect(
      rootSection
        .find(
          TableRow({
            index: rowIndex,
            innerText: including(tag),
          }),
        )
        .exists(),
    );
  },
  deleteViaAPI: (internalAuthorityId, ignoreErrors = false) => {
    cy.okapiRequest({
      method: 'DELETE',
      isDefaultSearchParamsRequired: false,
      path: `authority-storage/authorities/${internalAuthorityId}`,
      failOnStatusCode: !ignoreErrors,
    });
  },
  addNewField: (rowIndex, tag, content, indicator0 = '\\', indicator1 = '\\') => {
    cy.do([
      QuickMarcEditorRow({ index: rowIndex }).find(addFieldButton).click(),
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextField({ name: `records[${rowIndex + 1}].tag` }))
        .fillIn(tag),
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextField({ name: `records[${rowIndex + 1}].indicators[0]` }))
        .fillIn(indicator0),
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextField({ name: `records[${rowIndex + 1}].indicators[1]` }))
        .fillIn(indicator1),
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextArea({ name: `records[${rowIndex + 1}].content` }))
        .fillIn(content),
    ]);
  },

  addNewFieldAfterExistingByTag: (
    previousFieldTag,
    newFieldTag,
    content,
    indicator0 = '\\',
    indicator1 = '\\',
  ) => {
    cy.do(
      QuickMarcEditorRow({ tagValue: previousFieldTag }).perform((element) => {
        const rowIndex = Number(element.getAttribute('data-row').match(/\d+/)[0]);

        cy.do([
          QuickMarcEditorRow({ index: rowIndex }).find(addFieldButton).click(),
          QuickMarcEditorRow({ index: rowIndex + 1 })
            .find(TextField({ name: `records[${rowIndex + 1}].tag` }))
            .fillIn(newFieldTag),
          QuickMarcEditorRow({ index: rowIndex + 1 })
            .find(TextField({ name: `records[${rowIndex + 1}].indicators[0]` }))
            .fillIn(indicator0),
          QuickMarcEditorRow({ index: rowIndex + 1 })
            .find(TextField({ name: `records[${rowIndex + 1}].indicators[1]` }))
            .fillIn(indicator1),
          QuickMarcEditorRow({ index: rowIndex + 1 })
            .find(TextArea({ name: `records[${rowIndex + 1}].content` }))
            .fillIn(content),
        ]);
      }),
    );
  },

  checkLinkingAuthority650: () => {
    cy.expect(buttonLink.exists());
    cy.expect(Callout('Field 650 has been linked to a MARC authority record.').exists());
  },

  checkLinkingAuthority700: () => {
    cy.expect(buttonLink.exists());
    cy.expect(Callout('Field 700 has been linked to a MARC authority record.').exists());
  },

  changeField: (tag, content) => {
    cy.do([QuickMarcEditorRow({ tagValue: tag }).find(TextArea()).fillIn(content)]);
  },
  checkNotDeletableTags: (tag) => {
    cy.expect(QuickMarcEditorRow({ tagValue: tag }).find(deleteFieldButton).absent());
  },
  select008DropdownsIfOptionsExist(dropdownSelections, rowIndex = 3) {
    Object.entries(dropdownSelections).forEach(([label, value]) => {
      const selector = `select[name="records[${rowIndex}].content.${label}"]`;
      cy.get('body').then(($body) => {
        if ($body.find(selector).length > 0) {
          cy.get(selector).then(($select) => {
            if ($select.find(`option[value="${value}"]`).length > 0) {
              cy.get(selector).select(value);
            }
          });
        }
      });
    });
  },

  clickSaveAndCloseButton: () => {
    cy.do(saveAndCloseButton.click());
  },
  continueWithSaveAndCheck() {
    cy.do(continueWithSaveButton.click());
    this.waitLoading();
    cy.expect([calloutUpdatedRecordSuccess.exists(), rootSection.exists()]);
  },
  checkPresentedColumns: (presentedColumns) => presentedColumns.forEach((columnName) => cy.expect(MultiColumnListHeader(columnName).exists())),
  check008Field: (lang) => {
    cy.do([Select('Lang').choose(langOptions[lang])]);
  },
  checkRemovedTag: (rowIndex) => {
    cy.do([
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].tag` }))
        .fillIn('41'),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].content` }))
        .fillIn('Test'),
      saveAndCloseButton.click(),
    ]);
  },

  checkAddNew1XXTag: (rowIndex, tag, content) => {
    cy.do([
      QuickMarcEditorRow({ index: rowIndex }).find(addFieldButton).click(),
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextField({ name: `records[${rowIndex + 1}].tag` }))
        .fillIn(tag),
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextArea({ name: `records[${rowIndex + 1}].content` }))
        .fillIn(content),
      saveAndCloseButton.click(),
    ]);
  },

  checkRemoved1XXTag: () => {
    cy.expect(Callout('Record cannot be saved without 1XX field.').exists());
  },

  checkInfoButton: (tag, rowIndex) => {
    if (rowIndex) {
      cy.do(QuickMarcEditorRow({ index: rowIndex }).find(infoButton).click());
    } else {
      cy.do(QuickMarcEditorRow({ tagValue: tag }).find(infoButton).click());
    }
    cy.expect(HTML('This field is protected.').exists());
  },

  checkAddNew001Tag: (rowIndex, content) => {
    // need to wait until all data loaded
    cy.wait(2000);
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(addFieldButton).click());
    cy.do(
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextArea({ name: `records[${rowIndex + 1}].content` }))
        .fillIn(content),
    );

    // interactor doesn't work properly
    cy.get(`input[name='records[${rowIndex + 1}].tag']`).type('001');
    // cy.do(QuickMarcEditorRow({ index: rowIndex + 1 }).find(TextField({ name: `records[${rowIndex + 1}].tag` })).fillIn('001'));

    cy.expect(
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextField())
        .has({ disabled: true }),
    );
    cy.do(saveAndCloseButton.click());
    cy.expect(
      Callout(
        'This record has successfully saved and is in process. Changes may not appear immediately.',
      ).exists(),
    );
  },

  deleteTag: (rowIndex) => {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(deleteFieldButton).click());
  },

  changeTag: (rowIndex, tag) => {
    // wait until all the saved and updated values will be loaded.
    cy.wait(2000);
    cy.do(
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].tag` }))
        .fillIn(tag),
    );
  },

  updateDataByRowIndex: (rowIndex, content) => {
    // wait until all the saved and updated values will be loaded.
    cy.wait(2000);
    cy.do(
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].content` }))
        .fillIn(content),
    );
  },

  checkTagInRowDoesntExist: (rowIndex, tag) => {
    cy.expect(
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].tag`, value: tag }))
        .absent(),
    );
  },

  checkLinkingAuthority: () => {
    cy.expect(buttonLink.exists());
    cy.expect(Callout('Field 655 has been linked to a MARC authority record.').exists());
  },

  verifySharedAuthorityDetailsHeading(heading) {
    cy.expect(detailsPaneHeader.has({ title: `Shared • ${heading}` }));
  },

  verifyLocalAuthorityDetailsHeading(heading) {
    cy.expect(detailsPaneHeader.has({ title: `Local • ${heading}` }));
  },

  verifyFieldPositionInView(index, tag, content) {
    cy.expect(
      rootSection
        .find(TableRow({ index, innerText: including(content) }))
        .has({ innerText: including(`${tag}  `) }),
    );
  },

  createAuthoritySource: (body) => {
    return cy.okapiRequest({
      method: 'POST',
      path: 'authority-source-files',
      body,
      isDefaultSearchParamsRequired: false,
    });
  },

  checkActionDropdownContent(expectedContent) {
    const actualResArray = [];
    cy.do(actionsButton.click());
    expectedContent.forEach((option) => {
      cy.expect(Button(option).exists());
    });
    cy.then(() => DropdownMenu().buttons()).then((buttons) => {
      buttons.forEach((button) => actualResArray.push(button.innerText));
      cy.expect(actualResArray).to.deep.equal(expectedContent);
    });
  },

  verifyHeader(titleValue) {
    cy.expect([
      buttonClose.exists(),
      rootHeader.has({ title: including(titleValue) }),
      rootHeader.has({ subtitle: including('Last updated') }),
    ]);
  },

  verifySearchPanesIsAbsent() {
    cy.expect([searchPane.absent(), rootSection.find(closeButton).exists()]);
  },

  verifyFieldContent: (rowIndex, updatedDate) => {
    cy.get('table')
      .find('tr')
      .eq(rowIndex)
      .find('td')
      .then((elems) => {
        const dateFromField = DateTools.convertMachineReadableDateToHuman(elems.eq(2).text());
        const convertedUpdatedDate = new Date(updatedDate).getTime();
        const convertedDateFromField = new Date(dateFromField).getTime();
        const timeDifference = (convertedDateFromField - convertedUpdatedDate) / 1000;

        // check that difference in time is less than 1 minute
        expect(timeDifference).to.be.lessThan(120000);
      });
  },

  verify005FieldInMarc21AuthFormat() {
    cy.expect(
      TableRow({ innerText: including('005') })
        .find(TableCell({ innerText: matching(/^[0-9]{8}[0-9]{6}\.[0-9]$/) }))
        .exists(),
    );
  },

  verifyAfterSaveAndClose() {
    cy.expect([calloutUpdatedRecordSuccess.exists(), rootSection.exists()]);
  },

  verifyCreatedRecordSuccess() {
    cy.expect([calloutCreatedRecordSuccess.exists(), rootSection.exists()]);
  },

  getId() {
    cy.url()
      .then((url) => cy.wrap(url.split('?')[0].split('/').at(-1)))
      .as('authorityId');
    return cy.get('@authorityId');
  },

  getRecordsViaAPI: (deleted = false, idOnly = false, acceptHeader = null, query = null) => {
    cy.okapiRequest({
      method: 'GET',
      isDefaultSearchParamsRequired: false,
      path: 'authority-storage/authorities',
      searchParams: {
        limit: 1000,
        deleted,
        idOnly,
        query: query || '',
      },
      additionalHeaders: acceptHeader ? { accept: acceptHeader } : {},
    }).then(({ body }) => {
      cy.wrap(body).as('records');
    });
    return cy.get('@records');
  },

  checkSourceFileSelectShown: (isShown = true) => {
    if (isShown) cy.expect(sourceFileSelect.exists());
    else cy.expect(sourceFileSelect.absent());
  },

  selectSourceFile(sourceFileName) {
    cy.do(sourceFileSelect.choose(sourceFileName));
    this.verifySourceFileSelected(sourceFileName);
  },

  verifySourceFileOptionPresent: (option, isPresent = true) => {
    if (isPresent) cy.expect(sourceFileSelect.has({ allOptionsText: including(option) }));
    else cy.expect(sourceFileSelect.has({ allOptionsText: not(including(option)) }));
  },

  verifySourceFileSelected: (sourceFileName) => {
    cy.expect(sourceFileSelect.has({ checkedOptionText: sourceFileName }));
  },

  verifyVersionHistoryButtonShown(isShown = true) {
    const targetButton = rootHeader.find(versionHistoryButton);
    if (isShown) {
      cy.expect(targetButton.exists());
      cy.do(targetButton.hoverMouse());
      cy.expect(Tooltip().has({ text: versionHistoryToolTipText }));
    } else cy.expect(targetButton.absent());
  },

  clickVersionHistoryButton() {
    this.waitLoading();
    cy.expect(versionHistoryButton.exists());
    cy.do(versionHistoryButton.click());
    cy.expect(Spinner().exists());
    cy.expect(Spinner().absent());
    this.checkActionsButtonEnabled(false);
  },

  checkActionsButtonEnabled(isEnabled = true) {
    cy.expect(actionsButton.is({ disabled: !isEnabled }));
  },

  verifyValueHighlighted(value) {
    cy.expect(
      rootSection.find(TableCell({ innerHTML: including(`<mark>${value}</mark>`) })).exists(),
    );
  },

  setValid008DropdownValues() {
    defaultAuthority.tag008AuthorityBytesProperties.getAllProperties().forEach((property) => {
      cy.do(property.interactor.choose(property.defaultValue));
      cy.expect(property.interactor.has({ checkedOptionText: property.defaultValue }));
    });
  },
};
