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
  TableCell,
  TableRow,
  TextArea,
  TextField,
  including,
  matching,
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
const saveAndCloseButton = Button('Save & close');
const continueWithSaveButton = Modal().find(
  Button({ id: 'clickable-quick-marc-confirm-modal-confirm' }),
);
const buttonLink = Button({ icon: 'unlink' });
const calloutUpdatedRecordSuccess = Callout(
  'This record has successfully saved and is in process. Changes may not appear immediately.',
);
const searchPane = Section({ id: 'pane-authorities-filters' });
const closeButton = Button({ icon: 'times' });

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
    geoSubd: { interactor: TextField('Geo Subd'), defaultValue: 'n', newValue: 'v' },
    roman: { interactor: TextField('Roman'), defaultValue: '|', newValue: 'v' },
    lang: { interactor: TextField('Lang'), defaultValue: '\\', newValue: 'v' },
    kindRec: { interactor: TextField('Kind rec'), defaultValue: 'a', newValue: 'v' },
    catRules: { interactor: TextField('CatRules'), defaultValue: 'c', newValue: 'v' },
    sHSys: { interactor: TextField('SH Sys'), defaultValue: 'a', newValue: 'v' },
    series: { interactor: TextField('Series'), defaultValue: 'n', newValue: 'v' },
    numbSeries: { interactor: TextField('Numb Series'), defaultValue: 'n', newValue: 'v' },
    mainUse: { interactor: TextField('Main use'), defaultValue: 'a', newValue: 'v' },
    subjUse: { interactor: TextField('Subj use'), defaultValue: 'a', newValue: 'v' },
    seriesUse: { interactor: TextField('Series use'), defaultValue: 'b', newValue: 'v' },
    subdType: { interactor: TextField('Subd type'), defaultValue: 'n', newValue: 'v' },
    govtAg: { interactor: TextField('Govt Ag'), defaultValue: '|', newValue: 'v' },
    refEval: { interactor: TextField('RefEval'), defaultValue: 'a', newValue: 'v' },
    recUpd: { interactor: TextField('RecUpd'), defaultValue: 'a', newValue: 'v' },
    persName: { interactor: TextField('Pers Name'), defaultValue: 'a', newValue: 'v' },
    levelEst: { interactor: TextField('Level Est'), defaultValue: 'a', newValue: 'v' },
    modRecEst: { interactor: TextField('Mod Rec Est'), defaultValue: '\\', newValue: 'v' },
    source: { interactor: TextField('Source'), defaultValue: '\\', newValue: 'v' },
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

const authorityRecordsApi = {
  getRecordsViaAPI(
    deleted = false,
    idOnly = false,
    acceptHeader = null,
    query = null,
    limit = 2000,
    offset = 0,
  ) {
    return cy
      .okapiRequest({
        method: 'GET',
        isDefaultSearchParamsRequired: false,
        path: 'authority-storage/authorities',
        searchParams: {
          limit,
          deleted,
          idOnly,
          offset,
          query: query || '',
        },
        additionalHeaders: acceptHeader ? { accept: acceptHeader } : {},
      })
      .then(({ body }) => body);
  },

  getAllRecordsViaAPI(deleted = false, idOnly = false, acceptHeader = null, query = null) {
    const limit = 2000;
    let allRecords = [];
    let offset = 0;

    const fetchPage = () => {
      return this.getRecordsViaAPI(deleted, idOnly, acceptHeader, query, limit, offset).then(
        (body) => {
          allRecords = allRecords.concat(body.authorities);
          const totalRecords = body.totalRecords;

          if (allRecords.length < totalRecords) {
            offset += limit;
            return cy.wrap(null).then(fetchPage);
          } else {
            cy.log(`Found ${allRecords.length} records`);
            return cy.wrap(allRecords);
          }
        },
      );
    };

    return cy.wrap(null).then(fetchPage);
  },
};

export default {
  defaultAuthority,
  defaultUpdateJobProfile,
  waitLoading: () => cy.expect(rootSection.exists()),
  edit: () => {
    cy.do(rootSection.find(Button('Actions')).click());
    cy.do(Button('Edit').click());
    QuickMarcEditorWindow.waitLoading();
  },
  delete: () => {
    cy.do(rootSection.find(Button('Actions')).click());
    cy.do(Button('Delete').click());
  },
  contains: (expectedText) => cy.expect(rootSection.find(HTML(including(expectedText))).exists()),
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
  change008Field: (lang, kindrec, catrules) => {
    cy.do([
      TextField('Lang').fillIn(lang),
      TextField('Kind rec').fillIn(kindrec),
      TextField('CatRules').fillIn(catrules),
    ]);
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
  check008Field: () => {
    cy.do(TextField('Lang').fillIn('abc'));
    cy.expect(TextField('abc').absent());
    cy.do(TextField('Lang').fillIn('a'));
    cy.expect(TextField('Lang').has({ value: 'a' }));
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
    cy.wait(2000);
    // Check if the save was successful by looking for success callout or verify we're back to holdings view
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

  checkActionDropdownContent() {
    const actualResArray = [];
    const expectedContent = ['Edit', 'Export (MARC)', 'Print', 'Delete'];
    cy.do(rootSection.find(Button('Actions')).click());
    cy.expect([
      Button('Edit').has({ svgClass: including('edit') }),
      Button('Export (MARC)').has({ svgClass: including('download') }),
      Button('Print').has({ svgClass: including('print') }),
      Button('Delete').has({ svgClass: including('trash') }),
    ]);
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

  getId() {
    cy.url()
      .then((url) => cy.wrap(url.split('?')[0].split('/').at(-1)))
      .as('authorityId');
    return cy.get('@authorityId');
  },

  ...authorityRecordsApi,
};
