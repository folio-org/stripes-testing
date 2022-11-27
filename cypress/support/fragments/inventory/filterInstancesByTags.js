import uuid from 'uuid';
import { HTML, including } from '@interactors/html';
import {
  Button,
  Checkbox, MultiColumnList,
  MultiColumnListCell,
  MultiSelect,
  MultiSelectOption,
  Pane,
  Section,
  TextField
} from '../../../../interactors';
import Helper from '../finance/financeHelper';

const paneFilterSection = Section({ id: 'pane-filter' });
const paneResultsSection = Section({ id: 'pane-results' });
const instanceDetailsSection = Section({ id: 'pane-instancedetails' });
const instancesTagsSection = Section({ id: 'instancesTags' });
const tagsPane = Pane('Tags');
const tagsButton = Button({ id: 'clickable-show-tags' });
const resetAllButton = Button('Reset all');
const tagsAccordionButton = instancesTagsSection.find(Button('Tags'));
const emptyResultsMessage = 'Choose a filter or enter a search query to show results.';

export default {
  createInstanceViaApi() {
    const instanceData = {
      instanceTitle: `instanceTitle ${Helper.getRandomBarcode()}`,
      instanceId: uuid(),
      instanceTypeId: null,
    };

    return cy.getInstanceTypes({ limit: 1 })
      .then(instanceTypes => {
        instanceData.instanceTypeId = instanceTypes[0].id;
      }).then(() => {
        cy.createInstance({
          instance: {
            instanceId: instanceData.instanceId,
            instanceTypeId: instanceData.instanceTypeId,
            title: instanceData.instanceTitle,
          }
        });
      }).then(() => ({ instanceData }));
  },

  verifyPanesExist() {
    cy.expect(paneFilterSection.exists());
    cy.expect(paneResultsSection.exists());
    cy.expect(paneResultsSection.find(HTML(including(emptyResultsMessage))).exists());
  },

  verifySearchResult(instanceTitle) {
    cy.expect(MultiColumnListCell({ row: 0, content: instanceTitle }).exists());
  },

  selectFoundInstance(instanceTitle) {
    cy.do(MultiColumnListCell({ row: 0, content: instanceTitle }).click());
  },

  verifyInstanceDetailsView() {
    cy.expect(instanceDetailsSection.exists());
  },

  openTagsField() {
    cy.do(tagsButton.click());
  },

  verifyTagsView() {
    cy.expect(tagsPane.exists());
    // needs some waiting until request payload is gathered
    // otherwise, UI throws "Permissions" error
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1200);
  },

  addTag(tag) {
    cy.intercept('PUT', '**/inventory/instances/**').as('addTag');
    cy.do([
      MultiSelect({ id: 'input-tag' }).fillIn(tag),
      MultiSelect().open(),
      MultiSelectOption(including(tag)).click(),
    ]);
    cy.wait('@addTag');
  },

  verifyTagCount(count = '0') {
    cy.expect(tagsButton.find(HTML(including(count))).exists());
  },

  closeTagsAndInstanceDetailPane() {
    cy.do(instanceDetailsSection.find(Button({ icon: 'times' })).click());
    cy.expect(instanceDetailsSection.absent());
    cy.expect(tagsPane.absent());
  },

  resetAllAndVerifyNoResultsAppear() {
    cy.do(resetAllButton.click());
    cy.expect(paneResultsSection.find(HTML(including(emptyResultsMessage))).exists());
  },

  filterByTag(tag) {
    cy.do(tagsAccordionButton.click());
    // need to wait untill list with tags is uploaded
    cy.wait(1000);
    cy.do([
      instancesTagsSection.find(TextField()).fillIn(tag),
      instancesTagsSection.find(Checkbox(tag)).click()
    ]);
  },

  verifyIsFilteredByTag(instanceTitle) {
    cy.expect(MultiColumnListCell({ row: 0, content: instanceTitle }).exists());
    cy.expect(MultiColumnList().has({ rowCount: 1 }));
  }
};
