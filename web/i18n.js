/**
 * AniimoLab i18n Translation Module
 * Supports Vietnamese ('vi') and English ('en')
 */

const I18N_STORAGE_KEY = 'aniimolab_lang';

const TRANSLATIONS = {
    vi: {
        // App header
        app_tagline: "Trình mô phỏng sản xuất & Tối ưu hóa Gia Viên",
        disclaimer: "Một số công thức, cấp độ và số lượng cơ sở chưa được xác nhận chính thức trong game; các mục này được đánh dấu rõ nơi sử dụng.",
        nav_aniimo_tier: "BXH Aniimo",
        nav_facilities: "Công thức",
        nav_math: "Thuật toán",
        nav_guide: "Hướng dẫn",
        nav_theme: "Giao diện",
        nav_lang: "Tiếng Việt",
        btn_aniimo_tierlist: "Bảng kỹ năng Aniimo (Hideout Matrix)",
        modal_tier_title: "🏆 Bảng kỹ năng nhân công Aniimo (Homeland Worker Abilities)",
        modal_tier_subtitle: "Ma trận kỹ năng gia viên: gồm 27 biến thể Prismana (Cấp 4) và 54 loài cơ bản giai đoạn Tân Tinh (Nova Stage - Cấp 3/4 tiến hóa cao nhất).",

        // Card 1: Homeland & Power Grid
        homeland_title: "Gia Viên của bạn",
        clear_saved_btn: "Đặt lại dữ liệu",
        clear_saved_confirm: "Bạn có chắc muốn đặt lại toàn bộ dữ liệu đã lưu về mặc định?",
        rv_level: "Cấp RV",
        production_aniimo_cap: "Aniimo Vùng Sản Xuất",
        production_aniimo_max_suffix: "/ {max} tối đa",
        production_aniimo_tooltip: "Số Aniimo tối đa cho phép làm việc trong Vùng Sản Xuất (trồng trọt và chế biến); phần còn lại dành cho Vùng Xây Dựng.",
        emode_title: "Chế độ E (E-mode)",
        emode_generator: "Trụ điện / Máy phát",
        emode_supply_rate: "Tỷ lệ cấp điện",
        emode_standard: "100% (Tiêu chuẩn)",
        emode_optimal: "120% (Tối ưu buff)",
        power_gauge_title: "⚡ Công suất nguồn điện lưới:",
        emode_hint: "Tự động cân bằng điện trong giới hạn máy phát. Giải phóng công nhân Aniimo ở các cơ sở dùng điện; các cơ sở còn lại chạy thủ công với Aniimo.",
        simple_mode_hint: "Mặc định bạn đã xây dựng và nâng cấp tối đa mọi cơ sở theo cấp RV hiện tại.",
        simple_summary_title: "Chi tiết cơ sở & mô-đun",

        // Card 2: Level-Up Strategy & Inventory
        strategy_title: "Chiến lược nâng cấp RV",
        strategy_hint: "Sản xuất toàn bộ nguyên liệu cần cho cấp RV tiếp theo nhanh nhất có thể, sau đó tối đa hóa Xu Gia Viên từ năng lực sản xuất còn lại.",
        level_up_target: "Mục tiêu lên cấp RV",
        rv_costs: "Chi phí lên RV {level}",
        what_you_have: "Kho vật phẩm hiện có",
        what_you_have_hint: "Tính vào chi phí nâng cấp. Khối Gỗ, Cát Khoáng Sản và nguyên liệu cấp thấp sẽ được tự động chế biến lên cấp cao hơn.",

        // Card 3: Season & Recipes
        season_title: "Sự kiện Trăng Mùa Gặt",
        season_hint: "Sự kiện mùa vụ đặc biệt với tiền tệ Lúa Mì Ánh Trăng để mua hạt giống. Solver sẽ ưu tiên tối đa việc sản xuất các món ăn sự kiện bạn chọn để farm điểm Trăng Mùa Gặt.",
        season_plots_title: "Ô đất nông trại cho sự kiện",
        season_plots_radish: "Ô đất Củ Cải Sương Dạ Nguyệt",
        season_plots_pepper: "Ô đất Ớt Trăng Khuyết",
        season_plots_hint: "Dành {radish} ô Củ Cải Sương Dạ Nguyệt + {pepper} ô Ớt Trăng Khuyết (tổng {total} ô). Còn lại {remaining} ô đất nông trại cho nhân sâm & gạo.",
        season_dishes_title: "Món ăn sự kiện cần ưu tiên farm điểm",
        recipe_notes: "Ghi chú công thức",
        recipes_title: "Tùy chỉnh công thức",
        special_recipes_title: "Công thức đặc biệt",
        special_recipes_hint: "Các công thức cao cấp mở khóa theo cấp RV hoặc tiền tệ hiếm. Tích chọn các công thức bạn muốn kế hoạch sử dụng.",
        recipes_to_skip: "Công thức cần bỏ qua",
        recipes_to_skip_hint: "Kế hoạch sẽ không sử dụng các công thức này. Bạn cũng có thể bỏ qua trực tiếp bằng nút ✕ trên bảng kế hoạch.",
        search_recipes_placeholder: "Tìm kiếm công thức...",
        skip_btn: "Bỏ qua",

        // CTA
        find_plan_btn: "Tìm kế hoạch tối ưu",
        solving_btn: "Đang tính toán tối ưu...",

        // Results Section
        level_up_label: "Nâng cấp RV",
        your_rate_label: "Tốc độ thu hoạch",
        unit_second: "/ giây",
        unit_minute: "/ phút",
        unit_hour: "/ giờ",
        unit_day: "/ ngày",
        unit_opt_second: "mỗi giây",
        unit_opt_minute: "mỗi phút",
        unit_opt_hour: "mỗi giờ",
        unit_opt_day: "mỗi ngày",

        // Facility Plan
        facility_plan_title: "Nhiệm vụ từng cơ sở sản xuất",
        how_to_read: "Cách đọc bảng này",
        seeds_to_plant_title: "Hạt giống cần gieo trồng",
        profit_by_product_title: "Lợi nhuận theo sản phẩm",
        profit_hint: "Đã trừ chi phí mua hạt giống.",

        // 2D Layout Simulator
        layout_title: "Mô phỏng bố cục Gia Viên 2D",
        how_laid_out: "Nguyên lý bố trí",
        show_whole_homeland: "Hiện toàn bộ Gia Viên",
        simulate_label: "Mô phỏng di chuyển",
        storage_units_label: "Thiết Bị Lưu Trữ (SU):",
        replay_btn: "Phát lại",

        // Sidebar
        insights_title: "Tại sao chọn kế hoạch này? & Phân tích",
        optimal_solved: "Tối ưu chuẩn xác",
        aniimo_team_title: "Tổ đội công nhân Aniimo",
        aniimo_best: "Tối ưu nhất",
        aniimo_minimum: "Tối thiểu",
        aniimo_custom: "Aniimo của tôi",
        opportunities_title: "Cơ hội cải thiện",
        set_goal_title: "Đặt mục tiêu tích lũy",
        goal_hint: "Cập nhật tức thì theo kế hoạch trên.",
        goal_label: "Mục tiêu",
        target_coins_label: "Xu Gia Viên mục tiêu",
        current_coins_label: "Xu Gia Viên hiện có",
        total_time_label: "Tổng thời gian cần",
        amount_produced_label: "Xu Gia Viên sản xuất được",
        product_breakdown_title: "Chi tiết sản phẩm",
        seeds_needed_title: "Hạt giống cần thiết",

        // Table headers
        th_facility: "Cơ sở",
        th_count: "Số lượng",
        th_producing: "Đang sản xuất",
        th_aniimo: "Aniimo",
        th_why: "Mục đích",
        th_crop: "Cây trồng",
        th_plots: "Ô đất",
        th_seeds: "Hạt giống",
        th_cost: "Chi phí",
        th_product: "Sản phẩm",
        th_sold_hour: "Bán / giờ",
        th_profit_hour: "Lợi nhuận / giờ",
        th_share: "Tỷ lệ",
        th_profit_until_rv: "Lợi nhuận đến RV {rv}",
        th_need: "Cần",
        th_have: "Có sẵn",
        th_ready_in: "Xong trong",
        th_how_many: "Số lượng",
        th_busy_avg: "Tỷ lệ bận TB",
        th_where: "Vị trí làm việc",

        // Modals
        modal_facilities_title: "Công thức các cơ sở",
        modal_facilities_hint: "Toàn bộ công thức trong dữ liệu game, phân nhóm theo cơ sở sản xuất.",
        modal_math_title: "Cơ chế hoạt động & Thuật toán",
        modal_guide_title: "Hướng dẫn sử dụng AniimoLab",
        modal_close: "Đóng",

        // Additional UI keys
        aniimo_explain_summary: "Cách tổ đội Aniimo được tính toán",
        unverified_badge: "chưa xác thực",
        unverified_title: "Chưa kiểm chứng trong game",
        special_badge: "đặc biệt",
        season_badge: "mùa vụ",
        emode_badge: "⚡ Chế độ điện",
        surplus_label: "Thặng dư:",
        proven_best: "tối ưu chuẩn xác",
        best_in_time: "tốt nhất theo thời gian",
        fastest_level_up: "Lên cấp nhanh nhất",
        min_team_plan: "Tổ đội Aniimo tối thiểu",
        facilities_heading: "Cơ sở",
        modules_heading: "Mô-đun",
        total_label: "Tổng cộng",
        not_yet: "chưa mở",
        free: "miễn phí",
        su_opt_3: "3 Thiết Bị Lưu Trữ (Nông trại, Xưởng, Trung tâm)",
        su_opt_4: "4 Thiết Bị Lưu Trữ (+ Lâm nghiệp)",
        su_opt_5: "5 Thiết Bị Lưu Trữ (+ Mở rộng)"
    },
    en: {
        // App header
        app_tagline: "Cyber Homeland Production Simulator & Multi-Hub Optimizer",
        disclaimer: "A few recipes, facility levels and counts haven't been confirmed in game yet; they're marked where they're used.",
        nav_aniimo_tier: "Aniimo Tiers",
        nav_facilities: "Facilities",
        nav_math: "Math",
        nav_guide: "Guide",
        nav_theme: "Theme",
        nav_lang: "English",
        btn_aniimo_tierlist: "Aniimo Worker Abilities (Hideout Matrix)",
        modal_tier_title: "🏆 Aniimo Homeland Worker Abilities Matrix",
        modal_tier_subtitle: "Complete Homeland worker ability matrix: all 27 Prismana breeds (Level 4) and 54 ordinary Nova stage species (Level 3/4 highest evolution).",

        // Card 1: Homeland & Power Grid
        homeland_title: "Your Homeland",
        clear_saved_btn: "Clear saved values",
        clear_saved_confirm: "Are you sure you want to reset all saved inputs to default?",
        rv_level: "RV level",
        production_aniimo_cap: "Production Zone Aniimo",
        production_aniimo_max_suffix: "/ {max} max",
        production_aniimo_tooltip: "Maximum Aniimo workers allowed in Production Zone; remaining Aniimo are reserved for Construction Zone.",
        emode_title: "Electric Mode (E-mode)",
        emode_generator: "Generator",
        emode_supply_rate: "Supply Rate",
        emode_standard: "100% (Standard)",
        emode_optimal: "120% (Optimal Buff)",
        power_gauge_title: "⚡ Generator Power:",
        emode_hint: "Auto-balances power within generator limit. Frees Aniimo workers on electric units; remaining units run manually with Aniimo.",
        simple_mode_hint: "Assumes you've built and upgraded everything your RV level allows.",
        simple_summary_title: "Facilities and modules",

        // Card 2: Level-Up Strategy & Inventory
        strategy_title: "RV Level-Up Strategy",
        strategy_hint: "Gets everything your next RV level costs as soon as possible, then earns as many Home Coins as that leaves room for.",
        level_up_target: "Level up to RV",
        rv_costs: "RV {level} costs",
        what_you_have: "What you already have",
        what_you_have_hint: "Counts toward the level-up. Wood Blocks, Mineral Sand and lower tiers get processed up.",

        // Card 3: Season & Recipes
        season_title: "Harvest Moon Festival",
        season_hint: "A seasonal event with its own currency, Moonray Wheat, which buys the season's seeds. Keeping enough wheat on hand is up to you; plans show how much their seeds use.",
        recipe_notes: "Recipe Notes",
        recipes_title: "Recipes",
        special_recipes_title: "Special recipes",
        special_recipes_hint: "These take a rare currency to unlock. Plans only use the ones you tick.",
        recipes_to_skip: "Recipes to skip",
        recipes_to_skip_hint: "Plans won't use these, e.g. recipes behind unlocks you don't have yet. You can also skip one straight from a plan with its ✕.",
        search_recipes_placeholder: "Search recipes",
        skip_btn: "Skip",

        // CTA
        find_plan_btn: "Find the best plan",
        solving_btn: "Solving...",

        // Results Section
        level_up_label: "Level-Up",
        your_rate_label: "Your Rate",
        unit_second: "/ sec",
        unit_minute: "/ min",
        unit_hour: "/ hr",
        unit_day: "/ day",
        unit_opt_second: "per second",
        unit_opt_minute: "per minute",
        unit_opt_hour: "per hour",
        unit_opt_day: "per day",

        // Facility Plan
        facility_plan_title: "What Each Facility Should Do",
        how_to_read: "How to read this",
        seeds_to_plant_title: "Seeds to Plant",
        profit_by_product_title: "Profit by Product",
        profit_hint: "Net of seed costs.",

        // 2D Layout Simulator
        layout_title: "Homeland 2D Layout Simulator",
        how_laid_out: "How it's laid out",
        show_whole_homeland: "Show whole homeland",
        simulate_label: "Simulate",
        storage_units_label: "Storage Units:",
        replay_btn: "Replay",

        // Sidebar
        insights_title: "Why this Plan? & Insights",
        optimal_solved: "Optimal Solved",
        aniimo_team_title: "Aniimo Team",
        aniimo_best: "Best",
        aniimo_minimum: "Minimum",
        aniimo_custom: "My Aniimo",
        opportunities_title: "Opportunities",
        set_goal_title: "Set a Goal",
        goal_hint: "Updates instantly from the plan above.",
        goal_label: "Goal",
        target_coins_label: "Target Home Coins",
        current_coins_label: "Current Home Coins",
        total_time_label: "Total Time",
        amount_produced_label: "Home Coins Produced",
        product_breakdown_title: "Product Breakdown",
        seeds_needed_title: "Seeds Needed",

        // Table headers
        th_facility: "Facility",
        th_count: "Count",
        th_producing: "Producing",
        th_aniimo: "Aniimo",
        th_why: "Why",
        th_crop: "Crop",
        th_plots: "Plots",
        th_seeds: "Seeds",
        th_cost: "Cost",
        th_product: "Product",
        th_sold_hour: "Sold per hour",
        th_profit_hour: "Profit per hour",
        th_share: "Share",
        th_profit_until_rv: "Profit until RV {rv}",
        th_need: "Need",
        th_have: "Have",
        th_ready_in: "Ready in",
        th_how_many: "How many",
        th_busy_avg: "Busy on average",
        th_where: "Where",

        // Modals
        modal_facilities_title: "Facility Recipes",
        modal_facilities_hint: "Every recipe in the game data, grouped by facility. This is a reference table, not tied to your owned facility counts or levels.",
        modal_math_title: "How It Works",
        modal_guide_title: "AniimoLab Guide",
        modal_close: "Close",

        // Additional UI keys
        aniimo_explain_summary: "How the team is worked out",
        unverified_badge: "unverified",
        unverified_title: "Not yet checked in game",
        special_badge: "special",
        season_badge: "season",
        emode_badge: "⚡ E-mode",
        surplus_label: "Surplus:",
        proven_best: "proven best",
        best_in_time: "best found in time",
        fastest_level_up: "Fastest Level-Up",
        homeland_layout: "Homeland Layout",
        min_team_plan: "Minimum Team Plan"
    }
};

const VI_FACILITY_NAMES = {
    "Farmland": "Đất Nông Trại",
    "Woodland": "Đất Rừng Cây",
    "Mine": "Khu Mỏ",
    "Well": "Giếng Nước",
    "Tidewhisper Sandcastle": "Lâu Đài Cát Thủy Triều Thì Thầm",
    "Dewy House": "Nhà Dewy",
    "Nimbus Bed": "Giường Cỏ Mây",
    "Starfall Hammock": "Võng Sao Rơi",
    "Floral Windmill": "Cối Xay Gió Hoa",
    "Heat Furnace": "Lò Sưởi",
    "Cooling Unit": "Máy Làm Mát",
    "Sunlamp": "Đèn Mặt Trời",
    "Carousel Mill": "Cối Xay Vòng Quay",
    "Crafting Table": "Bàn Kỹ Nghệ",
    "Claw Game Cooker": "Bếp Kẹp Gắp Thú",
    "Simmering Pot": "Nồi Hầm",
    "Phonolfactory Table": "Bàn Chế Lưu Âm",
    "Bouncy Brew Keg": "Thùng Bia Nảy Nảy",
    "Blazing Stove": "Bếp Lò Rực Rửa",
    "Pickling Jar": "Hũ Muối Chua",
    "Jukebox Dryer": "Máy Sấy Hộp Nhạc",
    "Joy Wheel Loom": "Khung Cửi Ngựa Gỗ",
    "Woodworking Bench": "Bàn Gia Công Gỗ",
    "Chimney Kiln": "Lò Ống Khói",
    "Dance Pad Polisher": "Máy Nhảy Năng Lượng",
    "Aniipod Maker": "Máy Chế Tạo Aniipod"
};

const VI_ENV_MODES = {
    "Scorching": "Bỏng Cháy",
    "Warm": "Ấm Áp",
    "Cool": "Mát Mẻ",
    "Freeze": "Lạnh Buốt",
    "Adequate": "Thích Hợp",
    "Overlap": "Giao Thoa"
};

const VI_ABILITIES = {
    "Fire": "Hỏa",
    "Water": "Thủy",
    "Earth": "Thổ",
    "Grass": "Thảo",
    "Lightning": "Lôi",
    "Wind": "Phong",
    "Dark": "Ám",
    "Artisanship": "Kỹ Nghệ",
    "Leisure": "Giải Trí",
    "Hauling": "Khuân Vác",
    "Light": "Quang",
    "Ice": "Băng",
    "Perfumery": "Điều Hương"
};

const VI_MODULE_NAMES = {
    "ecological_module": "Mô-đun Sinh Thái",
    "kitchen_module": "Mô-đun Nhà Bếp",
    "resource_detector": "Máy Dò Tài Nguyên",
    "crafting_module": "Mô-đun Chế Tác",
    "Ecological Module": "Mô-đun Sinh Thái",
    "Kitchen Module": "Mô-đun Nhà Bếp",
    "Resource Detector": "Máy Dò Tài Nguyên",
    "Crafting Module": "Mô-đun Chế Tác",
    "rest_module": "Mô-đun Nghỉ Ngơi",
    "power_module": "Mô-đun Năng Lượng",
    "plant_research_module": "Mô-đun Nghiên Cứu Thực Vật",
    "incubation_reaction_module": "Mô-đun Phản Ứng Ấp Nở"
    ,"signal_emitter": "Bộ Phát Tín Hiệu"
};

const VI_PERSONALITIES = {
    "Instinctive": "Rụt Rè",
    "Energetic": "Năng Động",
    "Nimble": "Lanh Lợi",
    "Practical": "Thực Tế",
    "Faithful": "Trung Thành",
    "Tenacious": "Lạnh Lùng",
    "Playful": "Tinh Nghịch",
    "Judicious": "Quy Củ"
};

const VI_ITEM_NAMES = {
    "advanced_gemstone_dust": "Bụi Đá Quý Cao Cấp",
    "advanced_lemon_incense": "Hương Chanh Vàng Cao Cấp",
    "advanced_wind_chime": "Chuông Gió Cao Cấp",
    "agave": "Cây Thùa",
    "agave_drink": "Thức Uống Cây Thùa",
    "agave_syrup": "Siro Thùa",
    "aniipod": "Aniipod",
    "aniipod_mega": "Aniipod Cao Cấp",
    "aniipod_pro": "Aniipod Thượng Cấp",
    "apple": "Táo",
    "apple_candy": "Kẹo Táo",
    "apple_juice": "Nước Ép Táo",
    "apple_tart": "Bánh Tart Táo",
    "aromathyst": "Tinh Hương",
    "bamboo": "Tre",
    "bamboo_joss_stick": "Nhang Tre",
    "bamboo_ware": "Đồ Tre Đan",
    "berry_chocolate_coconut_pudding": "Bánh Pudding Dừa Sô-cô-la Quả Mọng",
    "bouquet": "Bó Hoa",
    "bread": "Bánh Mì",
    "candied_orange_flower": "Hoa Cam Ngào Đường",
    "candied_strawberries": "Dâu Tây Ngào Đường",
    "caramel_nut_chips": "Bánh Hạt Phủ Caramel",
    "cherry_blossom": "Hoa Anh Đào",
    "cherry_blossom_rice_ball": "Cơm Nắm Hoa Anh Đào",
    "cherry_incense": "Hương Anh Đào",
    "chestnut": "Hạt Dẻ",
    "chestnut_puree": "Hạt Dẻ Nghiền Mịn",
    "cider_vinegar": "Giấm Táo",
    "clay": "Đất Sét",
    "coarse_sifted_ore": "Quặng Sàng Thô",
    "cocoa": "Cacao",
    "cocoa_powder": "Bột Cacao",
    "cocoa_spread": "Sốt Cacao",
    "coconut": "Quả Dừa",
    "coconut_cocoa": "Cacao Dừa",
    "coconut_cookie": "Bánh Quy Dừa",
    "coconut_cooler": "Nước Dừa Mát Lạnh",
    "coconut_milk": "Nước Cốt Dừa",
    "coconut_oil": "Dầu Dừa",
    "copper_ore": "Quặng Đồng",
    "cotton": "Cây Bông Vải",
    "cotton_fabric": "Vải Bông",
    "cotton_thread": "Sợi Bông",
    "cranberry": "Nam Việt Quất",
    "cranberry_chocolate": "Sô-cô-la Nam Việt Quất",
    "cranberry_jam": "Mứt Nam Việt Quất",
    "cranberry_juice": "Nước Ép Nam Việt Quất",
    "creamy_potato_soup": "Súp Khoai Tây Kem",
    "deep_rock_spring_water": "Nước Suối Tầng Đá Sâu",
    "densified_timber_component": "Cấu Kiện Gỗ Ép Đặc",
    "doll": "Búp Bê",
    "dream_catcher": "Vòng Bắt Giấc Mơ",
    "dried_apple_slices": "Lát Táo Sấy Khô",
    "dried_bean_curd": "Đậu Phụ Khô",
    "dried_cherry_blossom": "Hoa Anh Đào Khô",
    "dried_cranberries": "Nam Việt Quất Sấy Khô",
    "dried_flowers": "Hoa Khô",
    "dried_ginseng": "Nhân Sâm Khô",
    "dried_grapes": "Nho Khô",
    "dried_lemon_slices": "Lát Chanh Vàng Sấy Khô",
    "dried_strawberries": "Dâu Tây Sấy Khô",
    "dye": "Thuốc Nhuộm",
    "dyed_cotton_fabric": "Vải Bông Nhuộm",
    "flower_bread": "Bánh Mì Hoa",
    "flowers_in_a_bottle": "Hoa Trong Chai",
    "fresh_water": "Nước Ngọt",
    "gem": "Đá Quý",
    "gemstone_dust": "Bụi Đá Quý",
    "ginseng": "Nhân Sâm",
    "ginseng_chestnut_cake": "Bánh Hạt Dẻ Nhân Sâm",
    "ginseng_porridge": "Cháo Nhân Sâm",
    "ginseng_powder": "Bột Nhân Sâm",
    "ginseng_water": "Nước Nhân Sâm",
    "grape": "Nho",
    "grape_candy": "Kẹo Nho",
    "grape_jam": "Mứt Nho",
    "grape_juice": "Nước Ép Nho",
    "grape_lemon_drink": "Nước Nho Chanh",
    "growth_bud": "Mầm Tăng Trưởng",
    "growth_flower": "Hoa Tăng Trưởng",
    "growth_fruit": "Quả Tăng Trưởng",
    "harvest_platter": "Đĩa Thức Ăn Mùa Gặt",
    "herbal_ginseng_aroma": "Hương Nhân Sâm Thảo Dược",
    "hot_cocoa": "Cacao Nóng",
    "jello": "Thạch",
    "laminated_beams": "Dầm Gỗ Ghép",
    "lavender": "Oải Hương",
    "lavender_cookies": "Bánh Quy Oải Hương",
    "lavender_incense": "Hương Oải Hương",
    "lavender_powder": "Bột Oải Hương",
    "lavender_sachet": "Túi Thơm Oải Hương",
    "lemon": "Chanh Vàng",
    "lemon_incense": "Hương Chanh Vàng",
    "lotion": "Kem Dưỡng Ẩm",
    "malt_sugar": "Mạch Nha",
    "maple_candy_apple_jam": "Mứt Táo Kẹo Phong",
    "maple_candy_roasted_potatoes": "Khoai Tây Nướng Kẹo Phong",
    "maple_candy_star": "Sao Kẹo Phong",
    "maple_sugar_chunk": "Khối Đường Phong",
    "maple_syrup": "Siro Cây Phong",
    "microcrystalline_ore_plate": "Tấm Quặng Vi Tinh Thể",
    "milled_rice": "Gạo Xay",
    "mixed_perfume": "Nước Hoa Sương Gió",
    "moondew_radish": "Củ Cải Sương Dạ Nguyệt",
    "moondew_radish_slices": "Củ Cải Sương Dạ Nguyệt Thái Lát",
    "natural_mineral_spring_water": "Nước Khoáng Tự Nhiên",
    "natural_rubber": "Cao Su Tự Nhiên",
    "nuts": "Hạt Cứng",
    "orange_flower": "Hoa Cam",
    "orange_flower_dew": "Sương Hoa Cam",
    "orange_flower_incense": "Hương Hoa Cam",
    "palm_bark": "Vỏ Cây Cọ",
    "palm_rope": "Dây Thừng",
    "pearl": "Ngọc Trai",
    "pearl_necklace": "Vòng Cổ Ngọc Trai",
    "petals": "Cánh Hoa",
    "plain_rice_porridge": "Cháo Trắng",
    "porcelain": "Đồ Sứ",
    "potato": "Khoai Tây",
    "potato_chips": "Bim Bim Khoai Tây",
    "potato_kvass": "Kvass Khoai Tây",
    "pottery": "Đồ Gốm",
    "premium_berry_chocolate_coconut_pudding": "Bánh Pudding Dừa Sô-cô-la Quả Mọng Thượng Hạng",
    "premium_bread": "Bánh Mì Thượng Hạng",
    "premium_jello": "Thạch Thượng Hạng",
    "premium_mixed_perfume": "Nước Hoa Sương Gió Thượng Hạng",
    "premium_potato_soup": "Súp Khoai Tây Thượng Hạng",
    "premium_river_washed_stones": "Đá Sông Bào Mòn Thượng Hạng",
    "premium_rose_freshener": "Mộc Hương Hoa Hồng Thượng Hạng",
    "premium_salted_lemon": "Chanh Muối Thượng Hạng",
    "premium_soap": "Xà Phòng Thượng Hạng",
    "premium_sweet_rice_wine": "Rượu Gạo Ngọt Thượng Hạng",
    "premium_wheat": "Lúa Mì Thượng Hạng",
    "quartz_ore": "Quặng Thạch Anh",
    "quick_aromathyst": "Công Thức Siêu Tốc: Tinh Hương",
    "quick_bamboo": "Công Thức Siêu Tốc: Tre",
    "quick_coconut": "Công Thức Siêu Tốc: Quả Dừa",
    "quick_deep_rock_spring_water": "Công Thức Siêu Tốc: Nước Suối Đá Sâu",
    "quick_fresh_water": "Công Thức Siêu Tốc: Nước Sạch",
    "quick_lemon": "Công Thức Siêu Tốc: Chanh",
    "quick_maple_syrup": "Công Thức Siêu Tốc: Siro Cây Phong",
    "quick_natural_mineral_spring_water": "Công Thức Siêu Tốc: Nước Khoáng Tự Nhiên",
    "quick_potato": "Công Thức Siêu Tốc: Khoai Tây",
    "quick_rice": "Công Thức Siêu Tốc: Gạo",
    "quick_scales": "Công Thức Siêu Tốc: Vảy",
    "quick_sea_salt": "Công Thức Siêu Tốc: Muối Biển",
    "quick_strawberry": "Công Thức Siêu Tốc: Dâu Tây",
    "quick_well_water": "Công Thức Siêu Tốc: Nước Giếng",
    "quick_wheat": "Công Thức Siêu Tốc: Lúa Mì",
    "quick_wool": "Công Thức Siêu Tốc: Len",
    "refined_flour": "Bột Mì Tinh Luyện",
    "refined_ore": "Quặng Tinh Luyện",
    "rice": "Gạo",
    "rice_drink": "Nước Gạo",
    "rice_vinegar": "Giấm Gạo",
    "rich_grape_compote": "Mứt Nho Đậm Đà",
    "river_washed_stones": "Đá Sông Bào Mòn",
    "roasted_soybeans": "Đậu Nành Rang",
    "roasted_waxing_moon_pepper": "Ớt Trăng Khuyết Nướng",
    "rock": "Đá",
    "rock_candy": "Đường Phèn",
    "rose": "Hoa Hồng",
    "rose_concentrate": "Tinh Chất Hoa Hồng",
    "rose_freshener": "Mộc Hương Hoa Hồng",
    "rose_incense": "Hương Hoa Hồng",
    "rose_shortbread": "Bánh Quy Bơ Hoa Hồng",
    "rough_lumber": "Gỗ Xẻ Thô",
    "rubber_duck": "Vịt Cao Su",
    "salted_cherry_blossom": "Hoa Anh Đào Muối",
    "salted_lemon": "Chanh Muối",
    "scales": "Vảy",
    "sea_salt": "Muối Biển",
    "shell": "Vỏ Ốc",
    "shell_ornament": "Đồ Mỹ Nghệ Vỏ Ốc",
    "shredded_coconut": "Vụn Dừa",
    "sintered_ore_brick": "Gạch Quặng Thiêu Kết",
    "soap": "Xà Phòng",
    "soy_sauce": "Nước Tương",
    "soy_sauce_fried_rice": "Cơm Rang Tương",
    "soy_sauce_tofu": "Đậu Phụ Chiên Tương",
    "soybean": "Đậu Nành",
    "standard_planks": "Ván Gỗ Tiêu Chuẩn",
    "star": "Sao",
    "star_wish_lantern": "Đèn Sao Nguyện Ước",
    "steamed_vermicelli_roll": "Bánh Cuốn",
    "strawberry": "Dâu Tây",
    "strawberry_candy": "Kẹo Dâu Tây",
    "strawberry_cream_puff": "Bánh Su Kem Dâu Tây",
    "strawberry_jam": "Mứt Dâu Tây",
    "strawberry_juice": "Nước Ép Dâu Tây",
    "sugar_roasted_chestnuts": "Hạt Dẻ Rang Đường",
    "sugarcane": "Mía",
    "sugarcane_juice": "Nước Mía",
    "sweet_rice_drink": "Nước Gạo Ngọt",
    "tanghulu": "Kẹo Hồ Lô",
    "toasted_rice_green_tea": "Trà Xanh Gạo Rang",
    "tofu": "Đậu Phụ",
    "umbral_hot_pot": "Lẩu Song Nguyệt",
    "umbral_pickle": "Dưa Muối Song Nguyệt",
    "umbral_sweet_and_spicy_sauce": "Xốt Song Nguyệt Cay Ngọt",
    "walnut": "Hạt Óc Chó",
    "walnut_cake": "Bánh Hạt Óc Chó",
    "walnut_milk": "Sữa Hạt Óc Chó",
    "waxing_moon_pepper": "Ớt Trăng Khuyết",
    "well_water": "Nước Giếng",
    "wheat": "Lúa Mì",
    "wheat_tea": "Trà Lúa Mì",
    "wheatmeal": "Bột Lúa Mì",
    "willow_wood": "Gỗ Liễu",
    "wind_chime": "Chuông Gió",
    "wood_sculpture": "Đồ Điêu Khắc Gỗ",
    "wool": "Len",
    "wool_fabric": "Vải Len",
    "woolen_yarn": "Sợi Len",
    "woven_toy": "Đồ Chơi Bằng Cỏ",
    "coins": "Xu Gia Viên",
    "wood_block": "Khối Gỗ",
    "mineral_sand": "Cát Khoáng Sản",
    "plywood": "Dăm Gỗ Ép"
};

let currentLang = 'vi';

function initI18n() {
    try {
        const saved = localStorage.getItem(I18N_STORAGE_KEY);
        if (saved === 'vi' || saved === 'en') {
            currentLang = saved;
        } else {
            // Default to Vietnamese as requested
            currentLang = 'vi';
        }
    } catch (e) {
        currentLang = 'vi';
    }
    applyI18n();
}

function getLang() {
    return currentLang;
}

function setLang(lang) {
    if (lang !== 'vi' && lang !== 'en') return;
    currentLang = lang;
    try {
        localStorage.setItem(I18N_STORAGE_KEY, lang);
    } catch (e) {}
    applyI18n();
    // Dispatch event so app.js can re-render dynamic tables if needed
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

function toggleLang() {
    setLang(currentLang === 'vi' ? 'en' : 'vi');
}

function t(key, fallback = '') {
    const bundle = TRANSLATIONS[currentLang] || TRANSLATIONS.vi;
    if (bundle && bundle[key] !== undefined) {
        return bundle[key];
    }
    const fallbackBundle = TRANSLATIONS.en;
    if (fallbackBundle && fallbackBundle[key] !== undefined) {
        return fallbackBundle[key];
    }
    return fallback || key;
}

function applyI18n() {
    // 1. Text elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            const val = t(key);
            if (val) el.textContent = val;
        }
    });

    // 2. Titles with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) {
            const val = t(key);
            if (val) el.setAttribute('title', val);
        }
    });

    // 3. Placeholders with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
            const val = t(key);
            if (val) el.setAttribute('placeholder', val);
        }
    });

    // 4. Update language toggle button label
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
        langBtn.innerHTML = currentLang === 'vi' 
            ? '<span class="btn-sym">🇻🇳</span> VI' 
            : '<span class="btn-sym">🇬🇧</span> EN';
        langBtn.title = currentLang === 'vi' ? 'Chuyển sang English' : 'Chuyển sang Tiếng Việt';
    }

    // 5. Update html lang attribute
    document.documentElement.lang = currentLang;
}

// Export to window for global access
window.VI_FACILITY_NAMES = VI_FACILITY_NAMES;
window.VI_MODULE_NAMES = VI_MODULE_NAMES;
window.VI_ENV_MODES = VI_ENV_MODES;
window.VI_ABILITIES = VI_ABILITIES;
window.VI_ITEM_NAMES = VI_ITEM_NAMES;
window.VI_PERSONALITIES = VI_PERSONALITIES;

window.i18n = {
    init: initI18n,
    getLang,
    setLang,
    toggleLang,
    t,
    apply: applyI18n,
    translations: TRANSLATIONS,
    facilities: VI_FACILITY_NAMES,
    modules: VI_MODULE_NAMES,
    modes: VI_ENV_MODES,
    abilities: VI_ABILITIES,
    items: VI_ITEM_NAMES,
    personalities: VI_PERSONALITIES
};
window.t = t;
window.th = (key, fallback) => t(key, fallback);
