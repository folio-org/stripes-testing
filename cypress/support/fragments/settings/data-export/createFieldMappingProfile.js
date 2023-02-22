import { Button , TextField, Checkbox, Accordion } from "../../../../../interactors";

export default {
    createFieldMappingProfileViaApi: (nameProfile) => {
        return cy.okapiRequest({
            method: 'POST',
            path: 'data-export/mapping-profiles',
            body: {
                transformations: [],
                recordTypes: ['SRS'],
                outputFormat: 'MARC',
                name: nameProfile
            },
            isDefaultSearchParamsRequired: false,
        }).then(({ response }) => { return response; });
    },
    createFieldMappingProfile(name, recordType) {
        cy.do([
            Button('New').click(),
            TextField('Name*').fillIn(name),
            Checkbox(recordType).click(),
            Accordion('Transformations').find(Button('Add transformations')).click(),
        ])
    },
}