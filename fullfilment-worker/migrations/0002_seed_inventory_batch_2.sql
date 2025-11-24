-- ================================
-- PRODUCT INVENTORY BATCH 2 of 3
-- Entries 46 to 90
-- ================================

-- Product Inventory
-- Uses warehouse IDs from postal_code_warehouse_map
-- Uses product_id, sku, and available_sizes from products

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_0844c90e',
        '3454a952-7607-475f-bd0d-e2a4e63b26a1',
        'P0014',
        'wh_004',
        'Chennai Central Warehouse',
        '{"5":13,"6":15,"7":72,"8":60,"9":30}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_3f29f12d',
        '3454a952-7607-475f-bd0d-e2a4e63b26a1',
        'P0014',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"5":38,"6":23,"7":55,"8":76,"9":38}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_c7f91984',
        'd54a4fb4-50ce-4f0d-8ff8-e8589b9537db',
        'P0015',
        'wh_006',
        'Hyderabad North Warehouse',
        '{"7":75,"8":67,"9":77,"10":29,"11":36,"12":23}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_08dee60d',
        'd54a4fb4-50ce-4f0d-8ff8-e8589b9537db',
        'P0015',
        'wh_002',
        'Delhi North Warehouse',
        '{"7":41,"8":68,"9":62,"10":73,"11":30,"12":40}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_c5b57da1',
        '599f3fe6-551a-4745-ac9f-dd43a091e3f8',
        'P0016',
        'wh_004',
        'Chennai Central Warehouse',
        '{"5":13,"6":15,"7":38,"8":59,"9":50}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_07e44650',
        '599f3fe6-551a-4745-ac9f-dd43a091e3f8',
        'P0016',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"5":31,"6":37,"7":20,"8":44,"9":26}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_63a8d44e',
        '599f3fe6-551a-4745-ac9f-dd43a091e3f8',
        'P0016',
        'wh_005',
        'Kolkata East Warehouse',
        '{"5":26,"6":23,"7":69,"8":78,"9":47}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_240cd415',
        '63e3a9d0-3815-4cbd-9e17-d0ac0b458dae',
        'P0017',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"6":29,"7":36,"8":32,"9":77,"10":48,"11":37,"12":24}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_e2139be8',
        '63e3a9d0-3815-4cbd-9e17-d0ac0b458dae',
        'P0017',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"6":33,"7":34,"8":20,"9":45,"10":67,"11":32,"12":33}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_6bdbf50c',
        '78547029-3722-4b8e-b32d-89140ab5ee54',
        'P0018',
        'wh_008',
        'Ahmedabad Central Warehouse',
        '{"7":38,"8":46,"9":58,"10":39,"11":31}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_bac7c820',
        '78547029-3722-4b8e-b32d-89140ab5ee54',
        'P0018',
        'wh_006',
        'Hyderabad North Warehouse',
        '{"7":64,"8":74,"9":69,"10":63,"11":15}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_651f49d1',
        '78547029-3722-4b8e-b32d-89140ab5ee54',
        'P0018',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"7":23,"8":70,"9":57,"10":74,"11":13}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_05135bd6',
        '15ffd9ce-51b6-4293-84ff-16643fa2d9a4',
        'P0019',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"6":11,"7":50,"8":36,"9":74,"10":67,"11":14,"12":31}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_1e5ea4f5',
        '15ffd9ce-51b6-4293-84ff-16643fa2d9a4',
        'P0019',
        'wh_006',
        'Hyderabad North Warehouse',
        '{"6":15,"7":35,"8":23,"9":68,"10":27,"11":19,"12":33}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_7f8c713e',
        '15ffd9ce-51b6-4293-84ff-16643fa2d9a4',
        'P0019',
        'wh_005',
        'Kolkata East Warehouse',
        '{"6":17,"7":45,"8":35,"9":59,"10":59,"11":15,"12":12}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_6cf69136',
        'b3e0e9ce-a6e8-4470-ae5f-8e0fd51c46fe',
        'P0020',
        'wh_002',
        'Delhi North Warehouse',
        '{"4":11,"5":17,"6":29,"7":60,"8":35}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_862c363b',
        'b3e0e9ce-a6e8-4470-ae5f-8e0fd51c46fe',
        'P0020',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"4":19,"5":32,"6":22,"7":24,"8":52}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_9e719f8e',
        'b3e0e9ce-a6e8-4470-ae5f-8e0fd51c46fe',
        'P0020',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"4":5,"5":25,"6":30,"7":63,"8":67}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_746d68f4',
        '86aeeea6-4a84-45e2-8012-4bc4c78eff8c',
        'P0021',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"7":40,"8":43,"9":66,"10":77,"11":39}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_c9686488',
        '86aeeea6-4a84-45e2-8012-4bc4c78eff8c',
        'P0021',
        'wh_005',
        'Kolkata East Warehouse',
        '{"7":48,"8":20,"9":46,"10":80,"11":29}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_afe96c05',
        '86aeeea6-4a84-45e2-8012-4bc4c78eff8c',
        'P0021',
        'wh_002',
        'Delhi North Warehouse',
        '{"7":22,"8":46,"9":45,"10":52,"11":20}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_32457829',
        '83a852bf-d61d-4655-842b-e3ede0cca5c1',
        'P0022',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"5":17,"6":29,"7":55,"8":60,"9":63}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_5aa8a857',
        '83a852bf-d61d-4655-842b-e3ede0cca5c1',
        'P0022',
        'wh_004',
        'Chennai Central Warehouse',
        '{"5":25,"6":17,"7":58,"8":24,"9":76}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_d31f5181',
        '83a852bf-d61d-4655-842b-e3ede0cca5c1',
        'P0022',
        'wh_002',
        'Delhi North Warehouse',
        '{"5":18,"6":16,"7":49,"8":61,"9":78}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_e280f0b5',
        'efb571b3-608c-4512-bb06-e7df9c8aa57e',
        'P0023',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"6":39,"7":62,"8":24,"9":62,"10":80,"11":40,"12":34}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_d0718e54',
        'efb571b3-608c-4512-bb06-e7df9c8aa57e',
        'P0023',
        'wh_007',
        'Pune West Warehouse',
        '{"6":40,"7":25,"8":21,"9":20,"10":53,"11":20,"12":36}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_dafd3c8b',
        'efb571b3-608c-4512-bb06-e7df9c8aa57e',
        'P0023',
        'wh_006',
        'Hyderabad North Warehouse',
        '{"6":25,"7":29,"8":42,"9":34,"10":59,"11":34,"12":14}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_066d0106',
        '72059f1a-b022-417d-b26f-0759d2133ed4',
        'P0024',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"4":12,"5":32,"6":28,"7":79,"8":49}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_c88818f0',
        '72059f1a-b022-417d-b26f-0759d2133ed4',
        'P0024',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"4":7,"5":34,"6":31,"7":38,"8":64}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_5aca363e',
        '72059f1a-b022-417d-b26f-0759d2133ed4',
        'P0024',
        'wh_005',
        'Kolkata East Warehouse',
        '{"4":6,"5":22,"6":38,"7":65,"8":23}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_394a735f',
        'b81b3c6f-ca30-4f74-a611-08d797e614f8',
        'P0025',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"6":31,"7":32,"8":37,"9":47,"10":43,"11":22,"12":30}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_2fc7c647',
        'b81b3c6f-ca30-4f74-a611-08d797e614f8',
        'P0025',
        'wh_004',
        'Chennai Central Warehouse',
        '{"6":35,"7":55,"8":39,"9":33,"10":43,"11":17,"12":36}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_03f706bf',
        'dcea8db7-9d59-4fcb-8880-8cc8f2b31c4b',
        'P0026',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"5":16,"6":37,"7":80,"8":55,"9":79}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_6cf8f7e5',
        'c8ed71c0-2b3e-4a8b-aeb8-8b60955e2b9e',
        'P0027',
        'wh_003',
        'Bangalore Tech Warehouse',
        '{"7":48,"8":27,"9":58,"10":60,"11":19}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_a05480ac',
        '4ceb8340-b7d0-4049-b063-2b5850feb0af',
        'P0028',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"5":37,"6":39,"7":50,"8":35,"9":60}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_0ca2d33e',
        '5e326f14-d916-42ec-8439-4269e016aba8',
        'P0029',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"7":65,"8":27,"9":26,"10":58,"11":32}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_26b75123',
        '5e326f14-d916-42ec-8439-4269e016aba8',
        'P0029',
        'wh_004',
        'Chennai Central Warehouse',
        '{"7":53,"8":71,"9":48,"10":26,"11":33}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_ac217d8f',
        '418a82d4-df20-4456-9656-6059bde73ef9',
        'P0030',
        'wh_008',
        'Ahmedabad Central Warehouse',
        '{"6":30,"7":37,"8":71,"9":65,"10":61,"11":30,"12":31}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_3c248ab9',
        'b96d3f72-c14e-401f-ae94-e9704cefd4cd',
        'P0031',
        'wh_005',
        'Kolkata East Warehouse',
        '{"6":21,"7":33,"8":43,"9":41,"10":66,"11":16}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_36707b3d',
        'b96d3f72-c14e-401f-ae94-e9704cefd4cd',
        'P0031',
        'wh_007',
        'Pune West Warehouse',
        '{"6":40,"7":50,"8":39,"9":48,"10":59,"11":23}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_9d4c1a06',
        '1dbadd81-c3ce-460d-95e9-578ceffd7c23',
        'P0032',
        'wh_002',
        'Delhi North Warehouse',
        '{"1":17,"2":12,"3":15,"4":19,"5":14}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_1981566b',
        'fef0c05f-6805-4cda-8dc0-1e1e82aa5514',
        'P0033',
        'wh_004',
        'Chennai Central Warehouse',
        '{"7":27,"8":65,"9":35,"10":59,"11":16}',
        0,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_adf83570',
        'b761fa35-2031-446f-8852-bf2eee74ae4c',
        'P0034',
        'wh_001',
        'Mumbai Central Warehouse',
        '{"5":37,"6":29,"7":77,"8":51,"9":60}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_5ba78d22',
        'b761fa35-2031-446f-8852-bf2eee74ae4c',
        'P0034',
        'wh_008',
        'Ahmedabad Central Warehouse',
        '{"5":28,"6":27,"7":59,"8":36,"9":72}',
        1,
        'INR'
      );

INSERT OR IGNORE INTO product_inventory (
        inventory_id, product_id, sku, warehouse_id, warehouse_name,
        stock, express_available, currency
      ) VALUES (
        'inv_de8400fd',
        '80a13dde-6136-4b6c-b963-b55b8e03a694',
        'P0035',
        'wh_006',
        'Hyderabad North Warehouse',
        '{"6":31,"7":60,"8":80,"9":35,"10":33,"11":16,"12":32}',
        0,
        'INR'
      );