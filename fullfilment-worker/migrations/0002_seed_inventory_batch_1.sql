-- ================================
-- PRODUCT INVENTORY BATCH 1 of 3
-- Entries 1 to 45
-- ================================

-- Product Inventory
-- Uses warehouse IDs from postal_code_warehouse_map
-- Uses product_id, sku, and available_sizes from products

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_4df93a96',
        '036bdd3b-584a-45c5-9b3f-758265267c75',
        'P0001',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"7":42,"8":26,"9":25,"10":62,"11":38}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_3716140b',
        '036bdd3b-584a-45c5-9b3f-758265267c75',
        'P0001',
        'wh_007',
        'Pune West Warehouse',
        '{"7":22,"8":63,"9":54,"10":72,"11":38}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_ca3f510c',
        '036bdd3b-584a-45c5-9b3f-758265267c75',
        'P0001',
        'wh_008',
        'Ahmedabad Central Warehouse',
        '{"7":58,"8":44,"9":41,"10":60,"11":36}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_6d3245fb',
        '036bdd3b-584a-45c5-9b3f-758265267c75',
        'P0001',
        'wh_004',
        'Chennai Central Warehouse',
        '{"7":40,"8":32,"9":25,"10":21,"11":34}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_39ce3235',
        'ab0f01ee-5309-4d2c-bdb6-3412e6534483',
        'P0002',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"5":22,"6":27,"7":39,"8":25,"9":61}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_33ab6601',
        'ab0f01ee-5309-4d2c-bdb6-3412e6534483',
        'P0002',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"5":25,"6":22,"7":47,"8":31,"9":41}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_3efeacfe',
        'ab0f01ee-5309-4d2c-bdb6-3412e6534483',
        'P0002',
        'wh_005',
        'Kolkata East Warehouse',
        '{"5":19,"6":13,"7":50,"8":25,"9":41}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_e798b5e3',
        'ab0f01ee-5309-4d2c-bdb6-3412e6534483',
        'P0002',
        'wh_007',
        'Pune West Warehouse',
        '{"5":17,"6":15,"7":46,"8":70,"9":58}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_25e3b07b',
        'b4a04fa6-131e-45b0-9de2-1c1c18f25a96',
        'P0003',
        'wh_007',
        'Pune West Warehouse',
        '{"6":17,"7":78,"8":73,"9":76,"10":51,"11":36,"12":30}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_3552be15',
        'b4a04fa6-131e-45b0-9de2-1c1c18f25a96',
        'P0003',
        'wh_008',
        'Ahmedabad Central Warehouse',
        '{"6":30,"7":38,"8":63,"9":48,"10":73,"11":29,"12":10}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_32648ee0',
        'b4a04fa6-131e-45b0-9de2-1c1c18f25a96',
        'P0003',
        'wh_004',
        'Chennai Central Warehouse',
        '{"6":32,"7":27,"8":20,"9":75,"10":34,"11":18,"12":24}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_fcd79913',
        '1558c4eb-5ab5-4d55-b12d-eb739a09aefa',
        'P0004',
        'wh_004',
        'Chennai Central Warehouse',
        '{"7":62,"8":22,"9":21,"10":61,"11":18}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_04b953b5',
        '1558c4eb-5ab5-4d55-b12d-eb739a09aefa',
        'P0004',
        'wh_006',
        'Hyderabad North Warehouse',
        '{"7":34,"8":74,"9":41,"10":75,"11":21}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_0dc87556',
        '1558c4eb-5ab5-4d55-b12d-eb739a09aefa',
        'P0004',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"7":80,"8":64,"9":69,"10":73,"11":25}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_7092a69a',
        '1558c4eb-5ab5-4d55-b12d-eb739a09aefa',
        'P0004',
        'wh_005',
        'Kolkata East Warehouse',
        '{"7":56,"8":46,"9":58,"10":43,"11":34}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_32a7c879',
        'd4336d41-ba67-45ae-85a3-67c78e131fb7',
        'P0005',
        'wh_005',
        'Kolkata East Warehouse',
        '{"6":20,"7":29,"8":72,"9":43,"10":72,"11":37,"12":24}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_116ffe11',
        'd4336d41-ba67-45ae-85a3-67c78e131fb7',
        'P0005',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"6":14,"7":31,"8":67,"9":48,"10":48,"11":25,"12":19}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_e91e120d',
        'd4336d41-ba67-45ae-85a3-67c78e131fb7',
        'P0005',
        'wh_002',
        'Delhi North Warehouse',
        '{"6":35,"7":42,"8":77,"9":78,"10":34,"11":36,"12":38}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_486c166e',
        'f70e7841-6d2b-4018-af84-87693c92ce22',
        'P0006',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"7":39,"8":54,"9":24,"10":32,"11":12,"12":23}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_932bc0e9',
        'f70e7841-6d2b-4018-af84-87693c92ce22',
        'P0006',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"7":64,"8":64,"9":32,"10":56,"11":35,"12":10}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_f4c24c10',
        'f70e7841-6d2b-4018-af84-87693c92ce22',
        'P0006',
        'wh_008',
        'Ahmedabad Central Warehouse',
        '{"7":50,"8":26,"9":47,"10":77,"11":18,"12":33}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_5d7e3aba',
        'e5575f97-0ff5-4cf5-a254-d40f41526ca1',
        'P0007',
        'wh_005',
        'Kolkata East Warehouse',
        '{"5":19,"6":13,"7":21,"8":53,"9":24}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_a387a418',
        'e5575f97-0ff5-4cf5-a254-d40f41526ca1',
        'P0007',
        'wh_006',
        'Hyderabad North Warehouse',
        '{"5":37,"6":14,"7":73,"8":77,"9":61}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_bedaafce',
        'e5575f97-0ff5-4cf5-a254-d40f41526ca1',
        'P0007',
        'wh_007',
        'Pune West Warehouse',
        '{"5":23,"6":26,"7":50,"8":56,"9":75}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_7687167c',
        'e88f0904-0c86-447e-bf6a-625b6b2d7352',
        'P0008',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"1":10,"2":16,"3":12,"4":8,"5":31}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_d7ab9d89',
        'e88f0904-0c86-447e-bf6a-625b6b2d7352',
        'P0008',
        'wh_005',
        'Kolkata East Warehouse',
        '{"1":17,"2":19,"3":6,"4":6,"5":24}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_12d6a1a2',
        'e88f0904-0c86-447e-bf6a-625b6b2d7352',
        'P0008',
        'wh_006',
        'Hyderabad North Warehouse',
        '{"1":12,"2":13,"3":12,"4":15,"5":11}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_d9365a4e',
        'a7ef0488-23e1-46cd-8b22-d6e2c27a76d6',
        'P0009',
        'wh_007',
        'Pune West Warehouse',
        '{"4":15,"5":17,"6":27,"7":64,"8":80}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_4681d93c',
        'a7ef0488-23e1-46cd-8b22-d6e2c27a76d6',
        'P0009',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"4":14,"5":16,"6":11,"7":47,"8":60}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_66beaed9',
        'a7ef0488-23e1-46cd-8b22-d6e2c27a76d6',
        'P0009',
        'wh_005',
        'Kolkata East Warehouse',
        '{"4":19,"5":30,"6":30,"7":51,"8":25}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_c9667123',
        'a7ef0488-23e1-46cd-8b22-d6e2c27a76d6',
        'P0009',
        'wh_006',
        'Hyderabad North Warehouse',
        '{"4":17,"5":20,"6":38,"7":42,"8":69}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_846b3d17',
        '525ab591-8bc8-459d-aaa9-51efc0733516',
        'P0010',
        'wh_002',
        'Delhi North Warehouse',
        '{"6":25,"7":78,"8":68,"9":59,"10":32,"11":32}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_f7314a65',
        '525ab591-8bc8-459d-aaa9-51efc0733516',
        'P0010',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"6":35,"7":77,"8":31,"9":49,"10":28,"11":29}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_5aeb45ec',
        '525ab591-8bc8-459d-aaa9-51efc0733516',
        'P0010',
        'wh_008',
        'Ahmedabad Central Warehouse',
        '{"6":25,"7":50,"8":44,"9":37,"10":27,"11":36}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_0b24debb',
        '525ab591-8bc8-459d-aaa9-51efc0733516',
        'P0010',
        'wh_006',
        'Hyderabad North Warehouse',
        '{"6":31,"7":45,"8":67,"9":73,"10":51,"11":23}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_5f2a0347',
        '07265d01-86fd-4eda-bbff-544a95651d3c',
        'P0011',
        'wh_002',
        'Delhi North Warehouse',
        '{"7":30,"8":63,"9":48,"10":71,"11":18,"12":20}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_115f09ef',
        '07265d01-86fd-4eda-bbff-544a95651d3c',
        'P0011',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"7":28,"8":78,"9":59,"10":40,"11":31,"12":27}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_320bebca',
        '07265d01-86fd-4eda-bbff-544a95651d3c',
        'P0011',
        'wh_007',
        'Pune West Warehouse',
        '{"7":23,"8":66,"9":55,"10":65,"11":29,"12":18}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_d023088e',
        '7499b309-3605-4ae6-a517-132a200ced23',
        'P0012',
        'wh_007',
        'Pune West Warehouse',
        '{"5":31,"6":28,"7":60,"8":43,"9":27}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_864a4949',
        '7499b309-3605-4ae6-a517-132a200ced23',
        'P0012',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"5":40,"6":31,"7":65,"8":75,"9":70}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_4caa56fa',
        '7499b309-3605-4ae6-a517-132a200ced23',
        'P0012',
        'wh_002',
        'Delhi North Warehouse',
        '{"5":24,"6":31,"7":37,"8":62,"9":70}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_3804798a',
        '7499b309-3605-4ae6-a517-132a200ced23',
        'P0012',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"5":35,"6":29,"7":40,"8":74,"9":77}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_da4d5e3c',
        'ab7f0df7-b2e2-4011-982b-76cc24b152ae',
        'P0013',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"7":20,"8":79,"9":53,"10":27,"11":24}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_5844b73d',
        'ab7f0df7-b2e2-4011-982b-76cc24b152ae',
        'P0013',
        'wh_008',
        'Ahmedabad Central Warehouse',
        '{"7":63,"8":62,"9":78,"10":63,"11":39}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_3a0dda4d',
        'ab7f0df7-b2e2-4011-982b-76cc24b152ae',
        'P0013',
        'wh_002',
        'Delhi North Warehouse',
        '{"7":62,"8":69,"9":35,"10":74,"11":10}',
        0,
        'INR'
      );