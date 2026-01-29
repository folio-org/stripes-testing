import {
  MultiColumnList,
  HTML,
  Button,
  Section,
  Select,
  TextArea,
  including,
  matching,
  Accordion,
  TextField,
  SelectionList,
  FieldSet,
  Selection,
  RepeatableFieldItem,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import InteractorsTools from '../../utils/interactorsTools';
import InstanceStates from './instanceStates';

const rootSection = Section({ id: 'inventoryform-addinventory' });
const identifiers = MultiColumnList({ id: 'list-identifiers' });

const contributorsSection = rootSection.find(Accordion('Contributor'));
const descriptiveDataSection = rootSection.find(Accordion('Descriptive data'));

const cancelButton = rootSection.find(Button('Cancel'));
const saveAndCloseButton = rootSection.find(Button('Save & close'));
const selectStatisticalCodeButton = Button({ name: 'statisticalCodeIds[0]' });

const deafultResouceType = 'text';

const fillResourceTitle = (resourceTitle) => {
  cy.do(TextArea('Resource title*').fillIn(resourceTitle));
};
const fillResourceType = (resourceType = deafultResouceType) => {
  cy.do(Select('Resource type*').choose(resourceType));
};

export default {
  fillResourceTitle,
  fillResourceType,
  checkExpectedOCLCPresence(OCLCNumber) {
    cy.expect(identifiers.find(HTML(including(OCLCNumber))).exists());
  },
  checkErrorMessageForStatisticalCode: (isPresented = true) => {
    if (isPresented) {
      cy.expect(FieldSet('Statistical code').has({ error: 'Please select to continue' }));
    } else {
      cy.expect(
        FieldSet({
          buttonIds: [including('stripes-selection')],
          error: 'Please select to continue',
        }).absent(),
      );
    }
  },
  waitLoading() {
    cy.expect(rootSection.exists());
  },
  fillRequiredValues(
    resourceTitle = `autotest_instance_title_${getRandomPostfix()}`,
    resourceType = deafultResouceType,
  ) {
    cy.wait(1000);
    fillResourceTitle(resourceTitle);
    fillResourceType(resourceType);
    cy.wait(300);
  },
  fillInstanceFields({
    contributor,
    publication,
    description,
    language,
    statusTerm,
    mode,
    title,
    resourceType,
    catalogedDate,
    instanceStatus,
    statisticalCode,
    adminNote,
    instanceIdentifier,
    edition,
    natureOfContent,
    format,
    frequency,
    instanceNote,
    electronicAccess,
    subject,
    classification,
  }) {
    if (contributor) {
      this.addContributor(contributor);
    }

    if (publication) {
      this.addPublication(publication);
    }

    if (description) {
      this.addDescription({ description });
    }

    if (language) {
      this.addLanduage({ language });
    }

    if (statusTerm) {
      cy.do(Select('Instance status term').choose(statusTerm));
    }

    if (mode) {
      cy.do(Select('Mode of issuance').choose(mode));
    }

    if (catalogedDate) {
      cy.do(TextField({ name: 'catalogedDate' }).fillIn(catalogedDate));
    }

    if (instanceStatus) {
      cy.do(Select({ name: 'statusId' }).choose(instanceStatus));
    }

    if (statisticalCode) {
      cy.do(Button('Add statistical code').click());
      cy.do([
        FieldSet('Statistical code')
          .find(RepeatableFieldItem({ index: 1 }))
          .find(Selection())
          .choose(including(statisticalCode)),
      ]);
    }

    if (adminNote) {
      cy.do(Button('Add administrative note').click());
      cy.do(
        FieldSet('Administrative note')
          .find(RepeatableFieldItem({ index: 1 }))
          .find(TextArea({ name: 'administrativeNotes[0]' }))
          .fillIn(adminNote),
      );
    }

    if (instanceIdentifier) {
      for (let i = 0; i < instanceIdentifier.length; i++) {
        cy.do([
          Button('Add identifier').click(),
          Select({ name: `identifiers[${i}].identifierTypeId` }).choose(instanceIdentifier[i].type),
          TextField({ name: `identifiers[${i}].value` }).fillIn(instanceIdentifier[i].value),
        ]);
      }
    }

    if (edition) {
      cy.do([Button('Add edition').click(), TextField({ name: 'editions[0]' }).fillIn(edition)]);
    }

    if (natureOfContent) {
      for (let i = 0; i < natureOfContent.length; i++) {
        cy.do([
          Button('Add nature of content').click(),
          Select({ name: `natureOfContentTermIds[${i}]` }).choose(natureOfContent[i]),
        ]);
      }
    }

    if (format) {
      for (let i = 0; i < format.length; i++) {
        cy.do([
          Button('Add format').click(),
          Select({ name: `instanceFormatIds[${i}]` }).choose(format[i]),
        ]);
      }
    }

    if (frequency) {
      for (let i = 0; i < frequency.length; i++) {
        cy.do([
          Button('Add frequency').click(),
          TextArea({ name: `publicationFrequency[${i}]` }).fillIn(frequency[i]),
        ]);
      }
    }

    if (instanceNote) {
      for (let i = 0; i < instanceNote.length; i++) {
        cy.do([
          Button('Add note').click(),
          Select({ name: `notes[${i}].instanceNoteTypeId` }).choose(instanceNote[i].type),
          TextArea({ name: `notes[${i}].note` }).fillIn(instanceNote[i].value),
        ]);
      }
    }

    if (electronicAccess) {
      cy.do([
        Button('Add electronic access').click(),
        Select({ name: 'electronicAccess[0].relationshipId' }).choose(
          electronicAccess.relationship,
        ),
        TextArea({ name: 'electronicAccess[0].uri' }).fillIn(electronicAccess.uri),
        TextArea({ name: 'electronicAccess[0].linkText' }).fillIn(electronicAccess.linkText),
      ]);
    }

    if (subject) {
      for (let i = 0; i < subject.length; i++) {
        cy.do([
          Button('Add subject').click(),
          TextField({ name: `subjects[${i}].value` }).fillIn(subject[i]),
        ]);
      }
    }

    if (classification) {
      for (let i = 0; i < classification.length; i++) {
        cy.do([
          Button('Add classification').click(),
          Select({ name: `classifications[${i}].classificationTypeId` }).choose(
            classification[i].type,
          ),
          TextField({ name: `classifications[${i}].classificationNumber` }).fillIn(
            classification[i].value,
          ),
        ]);
      }
    }

    this.fillRequiredValues(title, resourceType);
  },
  addContributor({ name, nameType, shouldExpand = true } = {}) {
    if (shouldExpand) {
      cy.do(contributorsSection.find(Button('Add contributor')).click());
    }
    cy.do([
      contributorsSection.find(TextArea({ name: 'contributors[0].name' })).fillIn(name),
      contributorsSection
        .find(Select({ name: 'contributors[0].contributorNameTypeId' }))
        .choose(nameType),
    ]);
  },
  addPublication({ place, date, shouldExpand = true } = {}) {
    if (shouldExpand) {
      cy.do(descriptiveDataSection.find(Button('Add publication')).click());
    }
    cy.do([
      descriptiveDataSection.find(TextArea({ name: 'publication[0].place' })).fillIn(place),
      descriptiveDataSection
        .find(TextField({ name: 'publication[0].dateOfPublication' }))
        .fillIn(date),
    ]);
  },
  addDescription({ description, shouldExpand = true } = {}) {
    if (shouldExpand) {
      cy.do(descriptiveDataSection.find(Button('Add description')).click());
    }
    cy.do([
      descriptiveDataSection
        .find(TextField({ name: 'physicalDescriptions[0]' }))
        .fillIn(description),
    ]);
  },
  addLanduage({ language, shouldExpand = true } = {}) {
    if (shouldExpand) {
      cy.do(descriptiveDataSection.find(Button('Add language')).click());
    }
    cy.do([descriptiveDataSection.find(Select({ name: 'languages[0]' })).choose(language)]);
  },
  clickAddStatisticalCodeButton() {
    cy.do(Button('Add statistical code').click());
    cy.expect(selectStatisticalCodeButton.exists());
  },
  chooseStatisticalCode(code) {
    cy.do(selectStatisticalCodeButton.click());
    cy.do(SelectionList().select(code));
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(rootSection.absent());
  },
  clickSaveAndCloseButton() {
    cy.wait(4000);
    cy.do(saveAndCloseButton.click());
    cy.wait(2000);
    cy.expect(rootSection.absent());
    cy.wait(2000);

    InteractorsTools.checkCalloutMessage(
      matching(new RegExp(InstanceStates.instanceSavedSuccessfully)),
    );
  },
  clickSaveCloseButton() {
    cy.wait(1000);
    cy.do(saveAndCloseButton.click());
  },
  deleteStatisticalCode(statisticalCode) {
    cy.do(rootSection.find(Button({ ariaLabel: 'Delete this item' })).click());
    cy.expect(Selection({ value: including(statisticalCode) }).absent());
  },
  addElectronicAccess({
    relationshipName,
    uri,
    linkText,
    materialsSpecified,
    urlPublicNote,
    index = 0,
  }) {
    const actions = [Button('Add electronic access').click()];

    if (relationshipName) {
      actions.push(
        Select({ name: `electronicAccess[${index}].relationshipId` }).choose(relationshipName),
      );
    }
    if (uri) {
      actions.push(TextArea({ name: `electronicAccess[${index}].uri` }).fillIn(uri));
    }
    if (linkText) {
      actions.push(TextArea({ name: `electronicAccess[${index}].linkText` }).fillIn(linkText));
    }
    if (materialsSpecified) {
      actions.push(
        TextArea({ name: `electronicAccess[${index}].materialsSpecification` }).fillIn(
          materialsSpecified,
        ),
      );
    }
    if (urlPublicNote) {
      actions.push(
        TextArea({ name: `electronicAccess[${index}].publicNote` }).fillIn(urlPublicNote),
      );
    }

    cy.do(actions);
  },
};
