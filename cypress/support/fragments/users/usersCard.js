import { HTML, including, Link } from '@interactors/html';
import {
  Accordion,
  and,
  Badge,
  Button,
  Checkbox,
  Image,
  KeyValue,
  List,
  ListItem,
  MessageBanner,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectOption,
  or,
  Pane,
  ProxyUser,
  Section,
  Selection,
  SelectionList,
  Spinner,
  TextArea,
  TextField,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import NewNote from '../notes/newNote';

const affiliationsAccordion = Accordion('Affiliations');
const patronBlocksAccordion = Accordion('Patron blocks');
const loansAccordion = Accordion('Loans');
const notesAccordion = Accordion('Notes');
const extendedInformationAccordion = Accordion('Extended information');
const contactInformationAccordion = Accordion('Contact information');
const customFieldsAccordion = Accordion('Custom fields');
const userPermissionsAccordion = Accordion('User permissions');
const createRequestActionsButton = Button('Create request');
const createFeeFineActionsButton = Button('New fee/fine');
const createPatronBlockActionsButton = Button('Create block');
const userInformationAccordion = Accordion('User information');
const rootSection = Section({ id: 'pane-userdetails' });
const loansSection = rootSection.find(Accordion({ id: 'loansSection' }));
const currentLoansLink = loansSection.find(Link({ id: 'clickable-viewcurrentloans' }));
const returnedLoansSpan = loansSection.find(HTML({ id: 'claimed-returned-count' }));
const userInformationSection = Accordion({ id: 'userInformationSection' });
const contactInfoSection = Accordion({ id: 'contactInfoSection' });
const extendedInfoSection = Accordion({ id: 'extendedInfoSection' });
const patronBlocksSection = Accordion({ id: 'patronBlocksSection' });
const permissionAccordion = Accordion({ id: 'permissionsSection' });
const affiliationsSection = Accordion({ id: 'affiliationsSection' });
const affiliationsButton = Button({ id: 'accordion-toggle-button-affiliationsSection' });
const requestsAccordion = Accordion({ id: 'requestsSection' });
const servicePointsAccordion = Accordion({ id: 'servicePointsSection' });
const proxySponsorAccordion = Accordion({ id: 'proxySection' });
const readingRoomAccessAccordion = Accordion({ id: 'readingRoomAccessSection' });
const openedRequestsLink = requestsAccordion.find(Link({ id: 'clickable-viewopenrequests' }));
const closedRequestsLink = requestsAccordion.find(HTML({ id: 'clickable-viewclosedrequests' }));
const notesSection = Accordion('Notes');
const notesAccordionSection = Section({ id: 'notesAccordion' });
const actionsButton = rootSection.find(Button('Actions'));
const errors = {
  patronHasBlocksInPlace: 'Patron has block in place.',
};
const feesFinesAccordion = rootSection.find(Accordion({ id: 'accountsSection' }));
const newNoteButton = notesSection.find(Button({ id: 'note-create-button' }));
const newBlockPane = Pane('New Block');
const saveAndCloseButton = Button({ id: 'patron-block-save-close' });
const cancelButton = Button({ id: 'expirationDate-modal-cancel-btn' });
const keepEditingButton = Button({ id: 'clickable-cancel-editing-confirmation-confirm' });
const closeWithoutSavingButton = Button({ id: 'clickable-cancel-editing-confirmation-cancel' });
const areYouSureModal = Modal('Are you sure?');
const listFeesFines = MultiColumnList({ id: 'list-accounts-history-view-feesfines' });
const createRequestButton = Button('New request');
const openedFeesFinesLink = feesFinesAccordion.find(Link({ id: 'clickable-viewcurrentaccounts' }));
const closedFeesFinesLink = feesFinesAccordion.find(HTML({ id: 'clickable-viewclosedaccounts' }));
const userRolesAccordion = rootSection.find(Accordion('User roles'));
const userRolesEmptyText = 'No user roles found';
const usersPath = Cypress.env('eureka') ? 'users-keycloak/users' : 'users';
const profilePictureCard = Image({ alt: 'Profile picture' });
const lastNameField = KeyValue('Last name');
const firstNameField = KeyValue('First name');
const rolesAffiliationSelect = Section({ id: 'rolesSection' }).find(Selection('Affiliation'));
const closeIconButton = Button({ icon: 'times' });
const preferredEmailCommunicationsField = KeyValue('Preferred email communications');

export default {
  errors,

  clickOnCloseIcon() {
    cy.wait(1000);
    cy.do(closeIconButton.click());
    cy.wait(1000);
  },

  openPatronBlocks() {
    cy.do(patronBlocksSection.clickHeader());
  },

  patronBlocksAccordionCovered() {
    cy.expect([
      patronBlocksSection
        .find(Button({ id: 'accordion-toggle-button-patronBlocksSection' }))
        .has({ ariaExpanded: 'false' }),
    ]);
  },

  affiliationsAccordionCovered() {
    cy.expect([affiliationsSection.find(affiliationsButton).has({ ariaExpanded: 'false' })]);
  },

  verifyAffiliationsDetails(primaryAffiliations, count, ...details) {
    cy.get('#affiliationsSection')
      .find('li')
      .then(($liElements) => {
        const liCount = $liElements.length;
        expect(liCount).to.be.gte(count);

        const primaryLiElement = $liElements.filter('[class^="primary-"]');
        expect(primaryLiElement).to.have.lengthOf(1);

        const text = primaryLiElement.text().trim();
        expect(text).to.equal(primaryAffiliations);

        details.forEach((detail) => {
          const detailElement = $liElements.filter(`:contains("${detail}")`);
          expect(detailElement).to.have.lengthOf.at.least(1);
        });
      });
    cy.wait(4000);
  },

  verifyAffiliationsQuantity(quantity) {
    cy.expect(affiliationsSection.find(Badge()).has({ value: quantity }));
  },

  verifyUserCardOpened() {
    cy.expect(Section({ id: 'pane-userdetails' }).exists());
    cy.wait(6000);
  },

  expandAffiliationsAccordion() {
    cy.do(affiliationsSection.clickHeader());
    cy.wait(1000);
  },

  affiliationsAccordionIsAbsent() {
    cy.expect(affiliationsSection.absent());
  },

  expandLoansSection(openLoans, returnedLoans) {
    cy.do(loansSection.clickHeader());

    return openLoans && this.verifyQuantityOfOpenAndClaimReturnedLoans(openLoans, returnedLoans);
  },

  expandLoansAccordion() {
    cy.do(loansAccordion.clickHeader());
    cy.expect(loansAccordion.has({ open: true }));
  },

  expandNotesSection({ details = '' } = {}) {
    cy.do(notesSection.clickHeader());

    return details && this.verifyNoteDetails({ details });
  },
  expandRequestsSection(openRequests, closedRequests) {
    cy.do(requestsAccordion.clickHeader());

    return openRequests && this.verifyQuantityOfOpenAndClosedRequests(openRequests, closedRequests);
  },
  expandReadingRoomAccessSection(readingRoomName, status, isRoomCreated = true) {
    cy.do(readingRoomAccessAccordion.clickHeader());
    if (isRoomCreated) {
      cy.do(
        MultiColumnListCell({ content: readingRoomName }).perform((element) => {
          const rowNumber = element.parentElement.getAttribute('data-row-inner');
          cy.expect(
            readingRoomAccessAccordion
              .find(MultiColumnListRow({ indexRow: `row-${rowNumber}` }))
              .find(MultiColumnListCell({ innerText: status }))
              .exists(),
          );
        }),
      );
    } else {
      cy.expect(
        readingRoomAccessAccordion.find(MultiColumnListCell({ content: readingRoomName })).absent(),
      );
    }
  },
  verifyQuantityOfOpenAndClosedRequests(openRequests, closedRequests) {
    cy.expect(
      openedRequestsLink.has({
        text: `${openRequests} open requests`,
      }),
    );

    if (closedRequests) {
      cy.expect(
        closedRequestsLink.has({
          text: `${closedRequests} closed request`,
        }),
      );
    }
  },
  verifyNoteDetails({ details = '' } = {}) {
    cy.expect([
      notesSection
        .find(MultiColumnListRow({ index: 0 }).find(MultiColumnListCell({ columnIndex: 1 })))
        .has({ content: and(including(`Title: ${details}`), including(`Details: ${details}`)) }),
      notesSection
        .find(MultiColumnListRow({ index: 0 }).find(MultiColumnListCell({ columnIndex: 2 })))
        .has({ content: 'General note' }),
    ]);
  },
  verifyQuantityOfOpenAndClaimReturnedLoans(openLoans, returnedLoans) {
    cy.expect(currentLoansLink.has({ text: `${openLoans} open loan${openLoans > 1 ? 's' : ''}` }));

    if (returnedLoans) {
      cy.expect(returnedLoansSpan.has({ text: ` (${returnedLoans} claimed returned)` }));
    }
  },
  clickCurrentLoansLink() {
    cy.do(currentLoansLink.click());
  },
  viewCurrentLoans({ openLoans, returnedLoans } = {}) {
    this.expandLoansSection(openLoans, returnedLoans);
    cy.wait(500);
    this.clickCurrentLoansLink();
  },
  openFeeFines(openFeesFines, closedFeesFines) {
    cy.do(feesFinesAccordion.clickHeader());

    return (
      openFeesFines && this.verifyQuantityOfOpenAndClosedFeeFines(openFeesFines, closedFeesFines)
    );
  },

  verifyQuantityOfOpenAndClosedFeeFines(openFeesFines, closedFeesFines) {
    cy.expect(
      openedFeesFinesLink.has({
        text: `${openFeesFines} open fee/fine `,
      }),
    );

    if (closedFeesFines) {
      cy.expect(
        closedFeesFinesLink.has({
          text: `${closedFeesFines} closed fee/fine`,
        }),
      );
    }
  },

  openNotesSection() {
    cy.do(Accordion({ id: 'notesAccordion' }).clickHeader());
  },

  verifyNoteInList(noteTitle) {
    cy.expect(
      notesAccordionSection.find(MultiColumnListCell({ content: including(noteTitle) })).exists(),
    );
  },

  clickNoteInList(noteTitle) {
    cy.do(
      notesAccordionSection.find(MultiColumnListCell({ content: including(noteTitle) })).click(),
    );
  },

  openCustomFieldsSection() {
    cy.do(Accordion({ id: 'customFields' }).clickHeader());
  },

  expandRequestSection() {
    cy.do(requestsAccordion.clickHeader());
    cy.expect([
      Link({ id: 'clickable-viewopenrequests' }).exists(),
      Link({ id: 'clickable-viewclosedrequests' }).exists(),
      createRequestButton.exists(),
    ]);
  },

  createNewRequest() {
    cy.do(createRequestButton.click());
    cy.wait(1000);
  },

  verifySponsorsAlphabeticalOrder() {
    cy.do(Accordion({ id: 'proxySection' }).clickHeader());
    cy.get('#proxySection h3 a').then(($elements) => {
      const users = [];
      cy.wrap($elements).each(($el) => {
        users.push($el.text());
      });
      cy.wrap(users).should('equal', users.sort());
    });
  },

  showOpenedLoans() {
    return cy.do(Link({ id: 'clickable-viewcurrentloans' }).click());
  },

  showOpenedFeeFines() {
    return cy.do(Link({ id: 'clickable-viewcurrentaccounts' }).click());
  },

  createPatronBlock() {
    cy.do(Button({ id: 'create-patron-block' }).click());
  },

  verifyNewBlockForm(saveBtnDisabled = true) {
    cy.expect([
      newBlockPane.exists(),
      saveAndCloseButton.has({ disabled: saveBtnDisabled }),
      cancelButton.has({ disabled: false }),
    ]);
  },

  cancelNewBlock() {
    cy.do(cancelButton.click());
    cy.expect([
      areYouSureModal.exists(),
      HTML(including('There are unsaved changes')),
      closeWithoutSavingButton.exists(),
      keepEditingButton.has({ focused: true }),
    ]);
  },

  keepEditingNewBlockForm() {
    cy.do(keepEditingButton.click());
    cy.expect(areYouSureModal.absent());
    this.verifyNewBlockForm(false);
  },

  closeWithoutSavingBlockForm() {
    cy.do(closeWithoutSavingButton.click());
    cy.expect(areYouSureModal.absent());
  },

  verifyCreatedPatronBlock(content) {
    cy.expect([
      newBlockPane.absent(),
      patronBlocksSection
        .find(
          MultiColumnListCell({
            column: 'Display description',
            row: 0,
          }),
        )
        .has({ content }),
    ]);
  },

  openPatronBlockByDescription(text) {
    cy.do(patronBlocksSection.find(MultiColumnListCell(including(text))).click());
  },

  verifyBlockInfo() {
    cy.expect([
      Accordion('Block information'),
      Button('Delete').has({ disabled: false }),
      saveAndCloseButton.has({ disabled: true }),
      cancelButton.has({ disabled: false }),
    ]);
  },

  createAndSaveNewPatronBlock(text) {
    this.openPatronBlocks();
    this.createPatronBlock();
    this.fillDescription(text);
    this.saveAndClose();
  },

  createNewPatronBlock(text) {
    this.openPatronBlocks();
    this.createPatronBlock();
    this.fillDescription(text);
  },

  selectTodayExpirationDate() {
    const today = new Date();
    cy.do(
      TextField({ name: 'expirationDate' }).fillIn(
        DateTools.getFormattedDate({ date: today }, 'YYYY-MM-DD'),
      ),
    );
  },

  openLastUpdatedInfo() {
    cy.do(Accordion({ headline: 'Update information' }).find(Button()).click());
  },

  selectTomorrowExpirationDate() {
    const tomorrow = DateTools.getTomorrowDay();
    cy.do(
      TextField({ name: 'expirationDate' }).fillIn(
        DateTools.getFormattedDate({ date: tomorrow }, 'YYYY-MM-DD'),
      ),
    );
  },

  submitWrongExpirationDate() {
    cy.expect(saveAndCloseButton.has({ disabled: true }));
    cy.expect(
      Pane({ id: 'title-patron-block' })
        .find(TextField({ error: 'Expiration date must be in the future' }))
        .exists(),
    );
  },

  submitPatronInformation(text) {
    cy.expect(
      patronBlocksSection
        .find(MultiColumnList({ id: 'patron-block-mcl' }))
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: text }),
    );
  },

  // Indexation starts from 1 for a row
  verifyPatronBlockDescription(row, description) {
    cy.expect(
      patronBlocksSection
        .find(MultiColumnList({ id: 'patron-block-mcl' }))
        .find(MultiColumnListRow({ index: row - 1 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: description }),
    );
  },

  submitNewBlockPageOpen() {
    cy.expect([
      TextArea({ id: 'patronBlockForm-desc' }).exists(),
      Checkbox({ name: 'borrowing' }).exists,
      Checkbox({ name: 'renewals' }).exists,
      Checkbox({ name: 'requests' }).exists,
    ]);
  },

  closeNewBlockPage() {
    cy.do(Button({ id: 'close-patron-block' }).click());
  },

  selectPatronBlock(text) {
    cy.do(
      patronBlocksSection
        .find(MultiColumnList({ id: 'patron-block-mcl' }))
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 1, content: text }))
        .click(),
    );
  },

  deletePatronBlock() {
    cy.do([
      Button({ id: 'patron-block-delete' }).click(),
      Button({ id: 'clickable-patron-block-confirmation-modal-confirm' }).click(),
    ]);
  },

  submitThatUserHasPatrons() {
    cy.expect(
      TextField({ id: 'patron-block-place' }).has({ value: 'Patron has block(s) in place' }),
    );
  },

  fillDescription(text) {
    cy.do(TextArea({ name: 'desc' }).fillIn(text));
    cy.expect(saveAndCloseButton.has({ disabled: false }));
  },

  fillDate(date) {
    cy.do(TextField('Expiration date').fillIn(date));
    cy.expect(saveAndCloseButton.has({ disabled: false }));
  },

  selectTemplate(templateName) {
    cy.do([Selection().open(), SelectionList().select(templateName)]);
  },

  saveAndClose() {
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());
  },

  getApi(userId) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `${usersPath}/${userId}`,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },

  verifyPermissions(permissions) {
    cy.do(permissionAccordion.clickHeader());
    permissions.forEach((permission) => {
      cy.expect(permissionAccordion.find(HTML(including(permission))).exists());
    });
  },

  verifyPermissionsNotExist(permissions) {
    cy.do(permissionAccordion.clickHeader());
    permissions.forEach((permission) => {
      cy.expect(permissionAccordion.find(HTML(including(permission))).absent());
    });
  },

  waitLoading: () => cy.expect(rootSection.exists()),

  startFeeFine: () => {
    cy.wait(500);
    cy.do(actionsButton.click());
    cy.do(Button('New fee/fine').click());
    cy.wait(500);
  },

  startRequest: () => {
    cy.do(actionsButton.click());
    cy.do(createRequestButton.click());
  },

  startBlock: () => {
    cy.do(actionsButton.click());
    cy.do(Button('New block').click());
  },

  openTagsPane() {
    this.verifyTagsIconIsPresent();
    cy.do(Button({ id: 'clickable-show-tags' }).click());
    cy.expect(Pane('Tags').exists());
    cy.wait(2000);
  },

  verifyTagsIconIsPresent: () => {
    cy.expect(Button({ icon: 'tag' }).exists());
  },

  verifyTagsIconIsAbsent: () => {
    cy.expect(Button({ icon: 'tag' }).absent());
  },

  addTag: (tag) => {
    cy.do([
      MultiSelect({ id: 'input-tag' }).fillIn(tag),
      MultiSelect({ id: 'input-tag' }).open(),
      MultiSelectOption(including(tag)).click(),
    ]);
  },

  deleteTag: (tag) => {
    cy.do(
      MultiSelect({ id: 'input-tag' })
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.expect(
      MultiSelect({ id: 'input-tag' })
        .find(HTML(including(tag)))
        .absent(),
    );
  },

  verifyTagsNumber: (tagsNum) => {
    cy.expect(
      Button({ icon: 'tag' })
        .find(HTML(including(tagsNum)))
        .exists(),
    );
  },

  hasSaveError(errorMessage) {
    cy.expect(rootSection.find(MessageBanner()).has({ textContent: errorMessage }));
  },
  startFeeFineAdding() {
    cy.do(feesFinesAccordion.find(Button('New fee/fine')).click());
  },
  startRequestAdding() {
    cy.do(requestsAccordion.find(createRequestButton).click());
  },
  viewAllFeesFines() {
    cy.do(feesFinesAccordion.find(Button({ id: 'clickable-viewallaccounts' })).click());
    cy.wait(2000);
  },
  viewAllClosedFeesFines() {
    cy.do(feesFinesAccordion.find(Button({ id: 'clickable-viewclosedaccounts' })).click());
  },
  verifyPatronBlockValue(value = '') {
    cy.expect(KeyValue('Patron group').has({ value: including(value) }));
  },

  verifySingleSelectValue({ data }) {
    cy.expect(KeyValue(data.fieldLabel).has({ value: including(data.firstLabel) }));
  },

  verifyExpirationDate(date) {
    // js date object
    const formattedDate = DateTools.getFormattedDateWithSlashes({ date });
    cy.expect(KeyValue('Expiration date').has({ value: formattedDate }));
  },

  openContactInfo() {
    cy.do(Accordion('Contact information').clickHeader());
  },

  verifyEmail(email) {
    cy.expect(KeyValue('Email').has({ value: email }));
  },

  verifyFeesFinesCount(count) {
    cy.expect(feesFinesAccordion.find(Badge()).has({ text: count }));
  },

  verifyOpenedFeeFines(count, totalAmount) {
    cy.expect(
      feesFinesAccordion.find(ListItem(including('open'))).has({
        text: including(`${count.toString()} open` && `Total: $${totalAmount.toString()}`),
      }),
    );
  },

  clickNewNoteButton() {
    cy.do(newNoteButton.click());
    NewNote.verifyNewNoteIsDisplayed();
  },

  openNoteForEdit(noteTitle) {
    cy.do(MultiColumnListCell(including(noteTitle)).find(Button('Edit')).click());
  },

  selectFeeFines(feeFines) {
    cy.do([listFeesFines.find(MultiColumnListCell(including(feeFines))).click()]);
  },

  verifyUserInformationPresence() {
    cy.expect(userInformationSection.exists());
  },

  verifyUserPermissionsAccordion(isShown = false) {
    // wait until accordions loaded
    cy.wait(1000);
    if (isShown) {
      cy.expect(permissionAccordion.exists());
      cy.expect(permissionAccordion.has({ open: false }));
    } else cy.expect(permissionAccordion.absent());
  },

  verifyUserRolesCounter(expectedCount) {
    cy.expect([
      userRolesAccordion.find(Spinner()).absent(),
      userRolesAccordion.has({ counter: expectedCount }),
    ]);
  },

  clickUserRolesAccordion(isExpanded = true) {
    cy.do(userRolesAccordion.clickHeader());
    cy.expect(userRolesAccordion.has({ open: isExpanded }));
  },

  verifyUserRoleNames(roleNames) {
    roleNames.forEach((roleName) => {
      cy.expect(userRolesAccordion.find(HTML(roleName)).exists());
    });
  },

  verifyUserRoleNamesOrdered(roleNames) {
    roleNames.forEach((roleName, index) => {
      cy.expect(userRolesAccordion.find(ListItem(including(roleName), { index })).exists());
    });
  },

  verifyUserRolesAccordionEmpty() {
    cy.wait(2000);
    cy.expect(userRolesAccordion.find(HTML(userRolesEmptyText)).exists());
  },

  verifyProfilePictureIsPresent(url) {
    cy.expect(rootSection.find(profilePictureCard).has({ src: including(url) }));
  },

  verifyProfilePictureRemoved() {
    cy.expect(profilePictureCard.has({ src: including('/./img/placeholderThumbnail') }));
  },

  verifyPlaceholderProfilePictureIsPresent() {
    cy.expect(profilePictureCard.has({ src: including('/./img/placeholderThumbnail') }));
  },

  verifyProfilePictureIsAbsent() {
    cy.expect(profilePictureCard.absent());
  },

  verifyUserLastFirstNameInCard(lastName, firstName = '-') {
    cy.expect([
      rootSection.find(lastNameField).has({ value: lastName }),
      rootSection.find(firstNameField).has({ value: firstName }),
    ]);
  },

  checkSelectedRolesAffiliation(affiliation) {
    cy.expect(
      rolesAffiliationSelect.has({ singleValue: or(affiliation, `${affiliation} (Primary)`) }),
    );
  },

  selectRolesAffiliation(affiliation) {
    cy.do(rolesAffiliationSelect.choose(or(affiliation, `${affiliation} (Primary)`)));
    this.checkSelectedRolesAffiliation(affiliation);
  },

  close() {
    this.verifyUserInformationPresence();
    cy.do(rootSection.find(Button({ icon: 'times' })).click());
    cy.wait(1000);
    cy.expect(rootSection.absent());
  },

  verifyUserRolesRowsCount(expectedCount) {
    cy.expect(userRolesAccordion.find(List()).has({ count: expectedCount }));
  },

  checkServicePoints(...points) {
    points.forEach((point) => {
      cy.expect(servicePointsAccordion.find(HTML(including(point))).exists());
    });
  },

  verifyNoServicePointsFound() {
    cy.expect(servicePointsAccordion.find(HTML(including('No service points found'))).exists());
  },

  openServicePointsAccordion() {
    cy.do(servicePointsAccordion.clickHeader());
    cy.wait(1000);
  },

  openContactInformationAccordion() {
    cy.do(contactInfoSection.clickHeader());
    cy.wait(1000);
  },

  openExtendedInformationAccordion() {
    cy.do(extendedInfoSection.clickHeader());
    cy.wait(1000);
  },

  verifyExtendedInformationFieldsPresence() {
    cy.expect([
      KeyValue('Date enrolled').exists(),
      KeyValue('External system ID').exists(),
      KeyValue('Birth date').exists(),
      KeyValue('Folio number').exists(),

      KeyValue('Request preferences').exists(),
      KeyValue('Default pickup service point').exists(),
      KeyValue('Fulfillment preference').exists(),
      KeyValue('Default delivery address').exists(),

      KeyValue('Department name').exists(),
      KeyValue('Username').exists(),
    ]);
  },

  verifyPronounsOnUserDetailsPane(pronouns) {
    cy.expect(rootSection.find(KeyValue('Pronouns')).has({ value: `${pronouns}` }));
  },

  verifyPronounsWrappedVisible(text) {
    cy.expect(rootSection.find(HTML(including(text))).exists());
  },

  verifyPronounsFieldEmpty() {
    cy.expect(rootSection.find(KeyValue('Pronouns')).has({ value: '' }));
  },

  verifyFullNameAndPronouns(
    status,
    lastName,
    preferredName = 'preferredName',
    testMiddleName = 'testMiddleName',
    pronouns = '',
  ) {
    cy.expect(
      Section({ id: 'pane-userdetails' })
        .find(HTML(`${lastName}, ${preferredName} ${testMiddleName}`))
        .exists(),
    );
    if (status === 'with') {
      cy.expect(
        Section({ id: 'pane-userdetails' })
          .find(HTML(`(${pronouns})`))
          .exists(),
      );
    }
  },

  openProxySponsorAccordion() {
    cy.do(proxySponsorAccordion.clickHeader());
    cy.wait(1000);
  },

  verifyUserProxyDetails(username) {
    const proxyUser = ProxyUser(including(username));
    cy.expect([
      proxyUser.exists(),
      proxyUser.find(KeyValue('Relationship Status')).has({ value: 'Active' }),
      proxyUser.find(KeyValue('Proxy can request for sponsor')).has({ value: 'Yes' }),
      proxyUser.find(KeyValue('Notifications sent to')).has({ value: 'Proxy' }),
      proxyUser.find(KeyValue('Expiration date')).has({ value: 'No value set-' }),
    ]);
  },

  checkKeyValue(label, value) {
    if (label === 'Expiration date') {
      const formatDateForUI = (dateString) => {
        const [day, month, year] = dateString.split('/');
        return `${day}/${month}/${year}`;
      };

      const uiFormattedDate = formatDateForUI(value);
      cy.expect(KeyValue(label, { value: uiFormattedDate }).exists());
    } else {
      cy.expect(KeyValue(label, { value }).exists());
    }
  },

  verifyUserDetails(user) {
    // Limitation with permissions
    // this.checkKeyValue('Username', user.username);
    // this.checkKeyValue('Email', user.email);
    this.checkKeyValue('First name', user.firstName);
    this.checkKeyValue('Barcode', user.barcode);
    this.checkKeyValue('Middle name', user.middleName);
    this.checkKeyValue('Last name', user.lastName);
    this.checkKeyValue('User type', user.userType.toLowerCase());
    this.checkKeyValue('Preferred first name', user.preferredFirstName);
    this.checkKeyValue('Expiration date', user.expirationDate);
    this.checkKeyValue('External system ID', user.externalSystemId);
    this.checkKeyValue('Birth date', user.birthDate);
    this.checkKeyValue('Phone', user.phone);
    this.checkKeyValue('Mobile phone', user.mobilePhone);
    this.checkKeyValue('Preferred contact', user.preferredContact);
    this.checkKeyValue('Status', user.status);
  },

  checkAccordionsForShadowUser() {
    cy.expect([
      userInformationAccordion.exists(),
      affiliationsAccordion.exists(),
      extendedInformationAccordion.exists(),
      contactInformationAccordion.exists(),
      customFieldsAccordion.exists(),
      servicePointsAccordion.exists(),
    ]);
    if (!Cypress.env('eureka')) cy.expect(userPermissionsAccordion.exists());
    else cy.expect(userPermissionsAccordion.absent());
    cy.expect([
      patronBlocksAccordion.absent(),
      proxySponsorAccordion.absent(),
      feesFinesAccordion.absent(),
      loansAccordion.absent(),
      requestsAccordion.absent(),
      notesAccordion.absent(),
    ]);
  },
  checkActionsForShadowUser() {
    cy.do(actionsButton.click());
    cy.expect([
      createRequestActionsButton.absent(),
      createFeeFineActionsButton.absent(),
      createPatronBlockActionsButton.absent(),
    ]);
    cy.do(actionsButton.click());
  },

  verifyLastUpdatedDate() {
    const updatedDate = DateTools.getFormattedDateWithSlashes({ date: new Date() });
    cy.expect(
      Accordion({ headline: 'Update information' })
        .find(HTML(including(`Record last updated: ${updatedDate}`)))
        .exists(),
    );
  },

  verifyLastUpdatedSource(userName) {
    cy.expect(
      Accordion({ headline: 'Update information' })
        .find(HTML(including(`Source: ${userName}`)))
        .exists(),
    );
  },

  verifyEmailCommunicationPreferencesField() {
    cy.expect(Accordion('Contact information').find(preferredEmailCommunicationsField).exists());
  },

  verifyEmailCommunicationPreferenceSelected(preferences) {
    const preferencesArray = Array.isArray(preferences) ? preferences : [preferences];
    preferencesArray.forEach((preference) => {
      cy.expect(preferredEmailCommunicationsField.find(HTML(including(preference))).exists());
    });
  },

  verifyRemovedEmailCommunicationPreference(preference) {
    cy.expect(preferredEmailCommunicationsField.find(HTML(including(preference))).absent());
  },

  verifyUserDetailsPaneOpen() {
    cy.expect(rootSection.exists());
  },

  checkNoNotesInAccordion() {
    cy.expect(rootSection.find(HTML(including('No notes found'))).exists());
  },

  verifyNotesCounter(expectedCount) {
    cy.expect([
      notesAccordion.find(Spinner()).absent(),
      notesAccordion.has({ counter: expectedCount }),
    ]);
  },

  verifyNoteInAccordion({ title, details = '' } = {}) {
    cy.expect(
      notesAccordion.find(
        MultiColumnListCell({
          columnIndex: 1,
          content: and(including(`Title: ${title}`), including(`Details: ${details}`)),
        }),
      ),
    );
  },
};
