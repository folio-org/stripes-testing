import Permissions from '../../../support/dictionary/permissions';
import { searchInstancesOptions } from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const searchOptions = {
      keyword: searchInstancesOptions[0],
      query: searchInstancesOptions.at(-2),
    };
    const organization = NewOrganization.getDefaultOrganization();
    const queries = {
      tooLong:
        'items.effectiveLocationId=="46057746-68d4-48ad-9429-732538985aa0" or "ea47dbca-3d47-4508-bcfb-277f0c8381db" or "f4619e23-d081-4447-a589-e278037e7f5e" or "fac5de34-26ee-456d-86b1-f04fdf680d65" or "2b8f7d63-706a-4b56-8a5e-50ad24e33e4c" or "39a16452-b2da-490b-8148-41c09781e4ab" or "a15727b2-e420-4d2c-bbbc-9a070433aa0e" or "14a41db6-b94d-4dfb-a0c5-602be498d5a8" or "411febe1-9a59-4cd8-b1e0-11eb92b9c7e5" or "6cb67a72-bc1b-4f49-896b-a8a286f4edd4" or "cfd7a7bd-99b5-47be-83c0-f87cbd2ccabd" or "97a9697d-e6b7-4149-8e93-de4ffaa11403" or "55183b04-e6b8-4e35-b511-f3d6aca0663c" or "26c7145e-4d86-484c-8b83-0ed7cad6f72b" or "27297b1a-bdde-415d-a5b7-d1852cdd1d27" or "98faab27-661a-43b6-920a-1f63ee4be501" or "ecd4a250-5ecb-4725-9cc3-103ec9561278" or "b1dbe1fa-d76e-4db0-96b4-62c4a0674b29" or "25c3c8bf-4c8f-49ac-9ea2-b26094946e80" or "08b16306-d85a-4b8a-b950-198f6939f5a3" or "1cbc25a6-9802-4e63-90c0-8bf0ae79dd95" or "6bc06f03-e8a8-4f3a-acda-9ae953cc1ad6" or "469321da-c270-4f95-a24d-d5929bd3514c" or "0830e5ca-d401-4303-9e64-b9b43b689e5c" or "f8940d17-d0dd-4217-bc38-bcd711917177" or "158dcd4c-0f24-4bec-8e2f-5a635df0b51c" or "fdf89328-d39c-4523-8ec1-5c115e758d8a" or "47b5ed08-d5d1-4a46-973d-10412c1d88e4" or "429970e4-f01e-4bfa-a89d-ae0b12f2a1b6" or "cb1faf5e-9f5c-4ab7-a532-62cbcbee7fec" or "a4534b17-8e37-4153-ac7e-578d5c6e0374" or "97e21d96-c850-4095-b07d-80984a1578eb" or "5fe3ee37-a3be-46cf-bdee-5c8eb0f824c7" or "2104ce3b-0605-44a6-9edd-a1ed15f7a200" or "d7137dcb-b78f-4439-a214-2f515cae221c" or "3ac07e12-f840-40f4-87c8-416dc29e657e" or "341d2088-e7f5-4706-8205-22deb293cb01" or "b0c49dad-c94c-44a3-ad95-8dc3a8efe33d" or "7f83e588-de0c-4a97-8e5e-defd6528a3a0" or "6f40ab68-03ec-47af-8f83-fe2141c2d06a" or "fb66b336-f7b9-4859-9068-74a0b866a2ed" or "61961dc1-8b19-47fe-8a56-c733052df2be" or "1bcba597-55bf-41ea-ab4c-c38947db40aa" or "c8672b49-ed59-44e5-a2db-967d68388f04" or "502e5b27-8aba-4af4-8bba-4f9cee32a3f3" or "9a11d65b-43ff-4b49-92ed-579391f7fd33" or "57b0b048-1dac-46eb-b24f-fc560647ecbd" or "f2a7db7f-3079-440e-80c4-ed4e188b56b7" or "9c011fdf-7913-4abc-921c-98229db47163" or "eefc4525-c264-443e-b2fc-397c36964eda" or "336723ca-7e78-4f06-8411-6ec7b16ce01c" or "192f8b62-dde6-4e7a-a1ac-928123c4378a" or "425e4107-f547-4a3c-8ca3-358a9f4f21f1" or "3d0f9546-f325-430b-9d30-20009da1dcac" or "1c98dd87-e8b6-44c4-83fc-5f8fd30bef9b" or "8aae9698-4277-49a0-9480-9ba4e1c3fd53" or "a9cf8b5a-f3d9-4945-bcc4-0f9737c36389" or "a8cee737-9ec7-4a23-9fac-66ad2de5b614" or "7d3d93e5-16c0-4a66-b72e-da605f90ba20" or "76848f56-397f-4b5e-b37a-366ad83a19da" or "83db1d46-acc4-4ddc-b6cd-611abc56eb67" or "c5e6971b-5830-444b-a3e9-b9c290f3c6e4" or "1eeeaf99-8862-43bf-8e1d-09b70ee90b4c" or "647dfa83-521b-42ca-86cb-fa2495fdba01" or "413d11f2-de5f-4cba-b809-700389ed1ad9" or "08b6cb11-ae16-4d32-8ea6-4b8cacb410a2" or "da314443-52e1-4dfb-86dd-04f78d67589a" or "301152f6-8b89-4eb9-ba94-5073e2b47970" or "9c561355-4fcb-400d-843f-fef4839cd8bd" or "071d9f2c-1e28-4ec7-815e-4dee92e19605" or "2f2ce7d0-ce34-40f7-9c73-e34fef5ee5dd" or "6729a965-07de-4083-bf7d-446eefc80b2f" or "3213e382-c9ef-4585-b825-96338dd07965" or "e5c12785-7cac-4257-b6c2-e99c650a7aab" or "6f5cd2a8-5a79-493f-a451-be7e0d5a48cb" or "d9d8383e-164f-4c61-a771-f24b77e3670d" or "acf4bd48-b561-4102-a31e-36a71547fe64" or "3d923067-0387-43d4-baa7-e9cf8ed37685" or "4eba9062-1a0f-4a0a-a619-270b6a857ec6" or "7017db0a-0509-4266-a2d3-2cd7d4ae8cd6" or "29bb1fe9-4a76-4bba-9fff-ddd656940237" or "f57bb781-a8ec-4b00-8c00-855070ae1538" or "752c2901-142b-453f-a353-ab5bc6de7020" or "f3a4b696-b7ba-4e2d-ab1a-442edcb2613e" or "4fd3f37f-733d-4db7-8ab0-4d4e292efb8e" or "84117b6c-b56f-4b30-adf4-4aa39b4637ad" or "6216269b-9c9e-4129-adc5-ca9397137edc" or "ca8458a2-5c84-4ae4-8fc4-f0ebdda35697" or "1a099f03-e7da-4f33-baa3-37819016c4a4" or "b53c3123-87d9-421c-9278-f7313cbe17dc" or "7aae2369-9cec-41fd-bdbd-8ab1425969fa" or "ad980a6f-e381-4e3c-999f-905c774fed9e" or "ed545644-8234-411b-982e-298a22c4e600" or "6daff586-2421-47c0-9026-e0511347a752" or "db597af7-b5ea-4617-bb03-32bf8f5322b0" or "0d8323dd-3572-407b-9a2a-89127924ceea" or "75fa7b77-2b90-4de2-8fb4-f9a716048122" or "6bd92f7b-1390-4c5c-b563-bbecd0a41d01" or "716584ce-8b75-488f-b964-018688fa831e" or "0a102843-4ba9-4365-bc71-2273ffbebcce" or "46057746-68d4-48ad-9429-732538985aa0" or "ea47dbca-3d47-4508-bcfb-277f0c8381db" or "f4619e23-d081-4447-a589-e278037e7f5e" or "fac5de34-26ee-456d-86b1-f04fdf680d65" or "2b8f7d63-706a-4b56-8a5e-50ad24e33e4c" or "39a16452-b2da-490b-8148-41c09781e4ab" or "a15727b2-e420-4d2c-bbbc-9a070433aa0e" or "14a41db6-b94d-4dfb-a0c5-602be498d5a8" or "411febe1-9a59-4cd8-b1e0-11eb92b9c7e5" or "6cb67a72-bc1b-4f49-896b-a8a286f4edd4" or "cfd7a7bd-99b5-47be-83c0-f87cbd2ccabd" or "97a9697d-e6b7-4149-8e93-de4ffaa11403" or "55183b04-e6b8-4e35-b511-f3d6aca0663c" or "26c7145e-4d86-484c-8b83-0ed7cad6f72b" or "27297b1a-bdde-415d-a5b7-d1852cdd1d27" or "98faab27-661a-43b6-920a-1f63ee4be501" or "ecd4a250-5ecb-4725-9cc3-103ec9561278" or "b1dbe1fa-d76e-4db0-96b4-62c4a0674b29" or "25c3c8bf-4c8f-49ac-9ea2-b26094946e80" or "08b16306-d85a-4b8a-b950-198f6939f5a3" or "1cbc25a6-9802-4e63-90c0-8bf0ae79dd95" or "6bc06f03-e8a8-4f3a-acda-9ae953cc1ad6" or "469321da-c270-4f95-a24d-d5929bd3514c" or "0830e5ca-d401-4303-9e64-b9b43b689e5c" or "f8940d17-d0dd-4217-bc38-bcd711917177" or "158dcd4c-0f24-4bec-8e2f-5a635df0b51c" or "fdf89328-d39c-4523-8ec1-5c115e758d8a" or "47b5ed08-d5d1-4a46-973d-10412c1d88e4" or "429970e4-f01e-4bfa-a89d-ae0b12f2a1b6" or "cb1faf5e-9f5c-4ab7-a532-62cbcbee7fec" or "a4534b17-8e37-4153-ac7e-578d5c6e0374" or "97e21d96-c850-4095-b07d-80984a1578eb" or "5fe3ee37-a3be-46cf-bdee-5c8eb0f824c7" or "2104ce3b-0605-44a6-9edd-a1ed15f7a200" or "d7137dcb-b78f-4439-a214-2f515cae221c" or "3ac07e12-f840-40f4-87c8-416dc29e657e" or "341d2088-e7f5-4706-8205-22deb293cb01" or "b0c49dad-c94c-44a3-ad95-8dc3a8efe33d" or "7f83e588-de0c-4a97-8e5e-defd6528a3a0" or "6f40ab68-03ec-47af-8f83-fe2141c2d06a" or "fb66b336-f7b9-4859-9068-74a0b866a2ed" or "61961dc1-8b19-47fe-8a56-c733052df2be" or "1bcba597-55bf-41ea-ab4c-c38947db40aa" or "c8672b49-ed59-44e5-a2db-967d68388f04" or "502e5b27-8aba-4af4-8bba-4f9cee32a3f3" or "9a11d65b-43ff-4b49-92ed-579391f7fd33" or "57b0b048-1dac-46eb-b24f-fc560647ecbd" or "f2a7db7f-3079-440e-80c4-ed4e188b56b7" or "9c011fdf-7913-4abc-921c-98229db47163" or "eefc4525-c264-443e-b2fc-397c36964eda" or "336723ca-7e78-4f06-8411-6ec7b16ce01c" or "192f8b62-dde6-4e7a-a1ac-928123c4378a" or "425e4107-f547-4a3c-8ca3-358a9f4f21f1" or "3d0f9546-f325-430b-9d30-20009da1dcac" or "1c98dd87-e8b6-44c4-83fc-5f8fd30bef9b" or "8aae9698-4277-49a0-9480-9ba4e1c3fd53" or "a9cf8b5a-f3d9-4945-bcc4-0f9737c36389" or "a8cee737-9ec7-4a23-9fac-66ad2de5b614" or "7d3d93e5-16c0-4a66-b72e-da605f90ba20" or "76848f56-397f-4b5e-b37a-366ad83a19da" or "83db1d46-acc4-4ddc-b6cd-611abc56eb67" or "c5e6971b-5830-444b-a3e9-b9c290f3c6e4" or "1eeeaf99-8862-43bf-8e1d-09b70ee90b4c" or "647dfa83-521b-42ca-86cb-fa2495fdba01" or "413d11f2-de5f-4cba-b809-700389ed1ad9" or "08b6cb11-ae16-4d32-8ea6-4b8cacb410a2" or "da314443-52e1-4dfb-86dd-04f78d67589a" or "301152f6-8b89-4eb9-ba94-5073e2b47970" or "9c561355-4fcb-400d-843f-fef4839cd8bd" or "071d9f2c-1e28-4ec7-815e-4dee92e19605" or "2f2ce7d0-ce34-40f7-9c73-e34fef5ee5dd" or "6729a965-07de-4083-bf7d-446eefc80b2f" or "3213e382-c9ef-4585-b825-96338dd07965" or "e5c12785-7cac-4257-b6c2-e99c650a7aab" or "6f5cd2a8-5a79-493f-a451-be7e0d5a48cb" or "d9d8383e-164f-4c61-a771-f24b77e3670d" or "acf4bd48-b561-4102-a31e-36a71547fe64" or "3d923067-0387-43d4-baa7-e9cf8ed37685" or "4eba9062-1a0f-4a0a-a619-270b6a857ec6" or "7017db0a-0509-4266-a2d3-2cd7d4ae8cd6" or "29bb1fe9-4a76-4bba-9fff-ddd656940237" or "f57bb781-a8ec-4b00-8c00-855070ae1538" or "752c2901-142b-453f-a353-ab5bc6de7020" or "f3a4b696-b7ba-4e2d-ab1a-442edcb2613e" or "4fd3f37f-733d-4db7-8ab0-4d4e292efb8e" or "84117b6c-b56f-4b30-adf4-4aa39b4637ad" or "6216269b-9c9e-4129-adc5-ca9397137edc" or "ca8458a2-5c84-4ae4-8fc4-f0ebdda35697" or "1a099f03-e7da-4f33-baa3-37819016c4a4" or "b53c3123-87d9-421c-9278-f7313cbe17dc" or "7aae2369-9cec-41fd-bdbd-8ab1425969fa" or "ad980a6f-e381-4e3c-999f-905c774fed9e" or "ed545644-8234-411b-982e-298a22c4e600" or "6daff586-2421-47c0-9026-e0511347a752" or "db597af7-b5ea-4617-bb03-32bf8f5322b0" or "0d8323dd-3572-407b-9a2a-89127924ceea" or "75fa7b77-2b90-4de2-8fb4-f9a716048122" or "6bd92f7b-1390-4c5c-b563-bbecd0a41d01" or "716584ce-8b75-488f-b964-018688fa831e" or "0a102843-4ba9-4365-bc71-2273ffbebcce" or "46057746-68d4-48ad-9429-732538985aa0" or "ea47dbca-3d47-4508-bcfb-277f0c8381db" or "f4619e23-d081-4447-a589-e278037e7f5e" or "fac5de34-26ee-456d-86b1-f04fdf680d65" or "2b8f7d63-706a-4b56-8a5e-50ad24e33e4c" or "39a16452-b2da-490b-8148-41c09781e4ab" or "a15727b2-e420-4d2c-bbbc-9a070433aa0e" or "14a41db6-b94d-4dfb-a0c5-602be498d5a8" or "411febe1-9a59-4cd8-b1e0-11eb92b9c7e5" or "6cb67a72-bc1b-4f49-896b-a8a286f4edd4" or "cfd7a7bd-99b5-47be-83c0-f87cbd2ccabd" or "97a9697d-e6b7-4149-8e93-de4ffaa11403" or "55183b04-e6b8-4e35-b511-f3d6aca0663c" or "26c7145e-4d86-484c-8b83-0ed7cad6f72b" or "27297b1a-bdde-415d-a5b7-d1852cdd1d27" or "98faab27-661a-43b6-920a-1f63ee4be501" or "ecd4a250-5ecb-4725-9cc3-103ec9561278" or "b1dbe1fa-d76e-4db0-96b4-62c4a0674b29" or "25c3c8bf-4c8f-49ac-9ea2-b26094946e80" or "08b16306-d85a-4b8a-b950-198f6939f5a3" or "1cbc25a6-9802-4e63-90c0-8bf0ae79dd95" or "6bc06f03-e8a8-4f3a-acda-9ae953cc1ad6" or "469321da-c270-4f95-a24d-d5929bd3514c" or "0830e5ca-d401-4303-9e64-b9b43b689e5c" or "f8940d17-d0dd-4217-bc38-bcd711917177" or "158dcd4c-0f24-4bec-8e2f-5a635df0b51c" or "fdf89328-d39c-4523-8ec1-5c115e758d8a" or "47b5ed08-d5d1-4a46-973d-10412c1d88e4" or "429970e4-f01e-4bfa-a89d-ae0b12f2a1b6" or "cb1faf5e-9f5c-4ab7-a532-62cbcbee7fec" or "a4534b17-8e37-4153-ac7e-578d5c6e0374" or "97e21d96-c850-4095-b07d-80984a1578eb" or "5fe3ee37-a3be-46cf-bdee-5c8eb0f824c7" or "2104ce3b-0605-44a6-9edd-a1ed15f7a200" or "d7137dcb-b78f-4439-a214-2f515cae221c" or "3ac07e12-f840-40f4-87c8-416dc29e657e" or "341d2088-e7f5-4706-8205-22deb293cb01" or "b0c49dad-c94c-44a3-ad95-8dc3a8efe33d" or "7f83e588-de0c-4a97-8e5e-defd6528a3a0" or "6f40ab68-03ec-47af-8f83-fe2141c2d06a" or "fb66b336-f7b9-4859-9068-74a0b866a2ed" or "61961dc1-8b19-47fe-8a56-c733052df2be" or "1bcba597-55bf-41ea-ab4c-c38947db40aa" or "c8672b49-ed59-44e5-a2db-967d68388f04" or "502e5b27-8aba-4af4-8bba-4f9cee32a3f3" or "9a11d65b-43ff-4b49-92ed-579391f7fd33" or "57b0b048-1dac-46eb-b24f-fc560647ecbd" or "f2a7db7f-3079-440e-80c4-ed4e188b56b7" or "9c011fdf-7913-4abc-921c-98229db47163" or "eefc4525-c264-443e-b2fc-397c36964eda" or "336723ca-7e78-4f06-8411-6ec7b16ce01c" or "192f8b62-dde6-4e7a-a1ac-928123c4378a" or "425e4107-f547-4a3c-8ca3-358a9f4f21f1" or "3d0f9546-f325-430b-9d30-20009da1dcac" or "1c98dd87-e8b6-44c4-83fc-5f8fd30bef9b" or "8aae9698-4277-49a0-9480-9ba4e1c3fd53" or "a9cf8b5a-f3d9-4945-bcc4-0f9737c36389" or "a8cee737-9ec7-4a23-9fac-66ad2de5b614" or "7d3d93e5-16c0-4a66-b72e-da605f90ba20" or "76848f56-397f-4b5e-b37a-366ad83a19da" or "83db1d46-acc4-4ddc-b6cd-611abc56eb67" or "c5e6971b-5830-444b-a3e9-b9c290f3c6e4" or "1eeeaf99-8862-43bf-8e1d-09b70ee90b4c" or "647dfa83-521b-42ca-86cb-fa2495fdba01" or "413d11f2-de5f-4cba-b809-700389ed1ad9" or "08b6cb11-ae16-4d32-8ea6-4b8cacb410a2" or "da314443-52e1-4dfb-86dd-04f78d67589a" or "301152f6-8b89-4eb9-ba94-5073e2b47970" or "9c561355-4fcb-400d-843f-fef4839cd8bd" or "071d9f2c-1e28-4ec7-815e-4dee92e19605" or "2f2ce7d0-ce34-40f7-9c73-e34fef5ee5dd" or "6729a965-07de-4083-bf7d-446eefc80b2f" or "3213e382-c9ef-4585-b825-96338dd07965" or "e5c12785-7cac-4257-b6c2-e99c650a7aab" or "6f5cd2a8-5a79-493f-a451-be7e0d5a48cb" or "d9d8383e-164f-4c61-a771-f24b77e3670d" or "acf4bd48-b561-4102-a31e-36a71547fe64" or "3d923067-0387-43d4-baa7-e9cf8ed37685" or "4eba9062-1a0f-4a0a-a619-270b6a857ec6" or "7017db0a-0509-4266-a2d3-2cd7d4ae8cd6" or "29bb1fe9-4a76-4bba-9fff-ddd656940237" or "f57bb781-a8ec-4b00-8c00-855070ae1538" or "752c2901-142b-453f-a353-ab5bc6de7020" or "f3a4b696-b7ba-4e2d-ab1a-442edcb2613e" or "4fd3f37f-733d-4db7-8ab0-4d4e292efb8e" or "84117b6c-b56f-4b30-adf4-4aa39b4637ad" or "6216269b-9c9e-4129-adc5-ca9397137edc" or "ca8458a2-5c84-4ae4-8fc4-f0ebdda35697" or "1a099f03-e7da-4f33-baa3-37819016c4a4" or "b53c3123-87d9-421c-9278-f7313cbe17dc" or "7aae2369-9cec-41fd-bdbd-8ab1425969fa" or "ad980a6f-e381-4e3c-999f-905c774fed9e" or "ed545644-8234-411b-982e-298a22c4e600" or "6daff586-2421-47c0-9026-e0511347a752" or "db597af7-b5ea-4617-bb03-32bf8f5322b0" or "0d8323dd-3572-407b-9a2a-89127924ceea" or "75fa7b77-2b90-4de2-8fb4-f9a716048122" or "6bd92f7b-1390-4c5c-b563-bbecd0a41d01" or "716584ce-8b75-488f-b964-018688fa831e" or "0a102843-4ba9-4365-bc71-2273ffbebcce"',
      validLength:
        'Software Quality Engineering: A Comprehensive Guide to Building High-Quality Software, Ensuring Reliability, Security, Performance, and User Satisfaction through Effective Testing, Analysis, and Continuous Improvement Strategies in the Modern Technological Landscape of the 21st Century - The Definitive Resource for Software Engineers, Quality Assurance Professionals, and Project Managers Seeking to Excel in the Field of Software Quality Engineering and Deliver Exceptional Software Products that Meet and Exceed Customer Expectations and Industry Standards - Unlocking the Secrets of Successful Software Development and Quality Assurance with Proven Techniques, Best Practices, and Real-World Case Studies from Leading Experts in the Field - Ates',
    };
    let user;
    let order;

    before('Create test data', () => {
      cy.getAdminToken();

      cy.then(() => {
        Organizations.createOrganizationViaApi(organization).then(() => {
          const orderData = NewOrder.getDefaultOngoingOrder({
            vendorId: organization.id,
          });
          Orders.createOrderViaApi(orderData).then((createdOrder) => {
            order = createdOrder;
          });
        });
      }).then(() => {
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersCreate.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
            authRefresh: true,
          });
          Orders.selectOrderByPONumber(order.poNumber);
          OrderDetails.selectAddPOLine();
          OrderLineEditForm.clickTitleLookUpButton();
          SelectInstanceModal.verifyModalView();
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      Organizations.deleteOrganizationViaApi(organization.id);
      Orders.deleteOrderViaApi(order.id);
    });

    it(
      'C503247 Select Instance plugin | Error message is displayed when search query URI request exceeds character limit (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C503247'] },
      () => {
        SelectInstanceModal.chooseSearchOption(searchOptions.query);
        SelectInstanceModal.checkSearchOptionSelected(searchOptions.query);
        SelectInstanceModal.fillInSearchQuery(queries.tooLong, {
          directInput: true,
        });
        SelectInstanceModal.clickSearchButton();
        SelectInstanceModal.verifyUriCharLimitMessageAndCallout();

        SelectInstanceModal.chooseSearchOption(searchOptions.keyword);
        SelectInstanceModal.checkSearchOptionSelected(searchOptions.keyword);
        SelectInstanceModal.fillInSearchQuery(queries.validLength);
        SelectInstanceModal.clickSearchButton();
        SelectInstanceModal.checkNoRecordsFound(queries.validLength);

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        SelectInstanceModal.checkTableContent();
        SelectInstanceModal.checkSearchInputCleared();

        SelectInstanceModal.chooseSearchOption(searchOptions.query);
        SelectInstanceModal.checkSearchOptionSelected(searchOptions.query);
        SelectInstanceModal.fillInSearchQuery(queries.tooLong, {
          directInput: true,
        });
        SelectInstanceModal.clickSearchButton();
        SelectInstanceModal.verifyUriCharLimitMessageAndCallout();

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        SelectInstanceModal.checkTableContent();
        SelectInstanceModal.checkSearchInputCleared();

        SelectInstanceModal.chooseSearchOption(searchOptions.query);
        SelectInstanceModal.checkSearchOptionSelected(searchOptions.query);
        SelectInstanceModal.fillInSearchQuery(queries.tooLong, {
          directInput: true,
        });
        SelectInstanceModal.clickSearchButton();
        SelectInstanceModal.verifyUriCharLimitMessageAndCallout();
      },
    );
  });
});
