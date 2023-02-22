import { Pane, NavListItem, Button, PaneHeader, TextField, Select, TextArea, TextFieldIcon, TextInput, MultiColumnListCell, HTML } from "../../../../../interactors";

const jobProfilesPane = Pane('Job profiles');
const newButton = Button('New');
const paneHeader = PaneHeader('New job profile');
const XButton = paneHeader.find(Button({ icon: 'times' }));
const saveAndCloseButton = Button('Save & close')
const cancelButton = Button('Cancel');
const nameTextfield = TextField('Name*');
const descriptionTextarea = TextArea('Description');
const selectMappingProfileDropdown = Select({ name: 'mappingProfileId' });

export default {
	goToJobProfilesTab() {
		cy.do(NavListItem('Data export').click());
		cy.expect(Pane('Data export').exists());
		cy.do(NavListItem('Job profiles').click());
		cy.expect(jobProfilesPane.exists());
	},
	clickNewJobProfile() {
		cy.do(jobProfilesPane.find(newButton).click());
	},
	verifyNewJobProfileForm() {
		cy.expect([
			paneHeader.exists(),
			XButton.exists(),
			nameTextfield.exists(),
			Select('Mapping profile*').exists(),
			selectMappingProfileDropdown.exists(),
			descriptionTextarea.exists(),
			saveAndCloseButton.has({ disabled: true }),
			cancelButton.has({ disabled: false }),
		])
	},
	clickNameTextfield() {
		cy.do(nameTextfield.find(TextInput()).click());
	},
	clickDescriptionTextarea() {
		cy.do(descriptionTextarea.click());
	},
	verifyNameValidationError() {
		cy.expect([
			nameTextfield.find(TextFieldIcon({ id: 'icon-job-profile-name-validation-error' })).exists(),
			nameTextfield.has({ valid: false }),
			HTML('Please enter a value').exists(),
		])
	},
	verifyNameValidationErrorGone() {
		cy.expect(HTML('Please enter a value').absent());
	},
	fillinNameTextfield(content) {
		cy.do(nameTextfield.fillIn(content));
	},
	verifySaveAndCloseButtonEnabled() {
		cy.do(saveAndCloseButton.has({ disabled: false }));
	},
	clickSelectMappingProfileDropdown() {
		cy.do(selectMappingProfileDropdown.focus());
	},
	verifySelectMappingProfileValidationError() {
		cy.expect([
			selectMappingProfileDropdown.has({ valid: false }),
			HTML('Please enter a value').exists(),
		])
	},
	selectMappingProfileFromDropdown(mappingProfileName) {
		cy.do(selectMappingProfileDropdown.choose(mappingProfileName));
	},
	verifySelectMappingProfileValidationErrorGone() {
		cy.expect([
			selectMappingProfileDropdown.has({ valid: true }),
			HTML('Please enter a value').absent(),
		])
	},
	saveAndClose() {
		cy.do(saveAndCloseButton.click());
	},
	fillinDescription(descriptionText) {
		cy.do(descriptionTextarea.fillIn(descriptionText));
	},
	verifyJobProfileInTheTable(jobProfileName) {
		cy.expect(jobProfilesPane.find(MultiColumnListCell({ content: `${jobProfileName}` })))
	},
	getJobProfile: (searchParams) => {
		return cy
			.okapiRequest({
				path: 'data-export/job-profiles',
				searchParams,
				isDefaultSearchParamsRequired: false
			})
			.then((response) => {
				console.log(response);
				return response.body.jobProfiles[0];
			});
	},
	deleteJobProfileViaApi: (id) => cy.okapiRequest({
		method: 'DELETE',
		path: `data-export/job-profiles/${id}`,
		isDefaultSearchParamsRequired: false
	}),
}
