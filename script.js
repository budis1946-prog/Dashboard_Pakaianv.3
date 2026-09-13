let db;
const DB_NAME = "TokoBajuDB";
const STORE_NAME = "pakaian";

// 1. Inisialisasi Database Browser (IndexedDB)
const request = indexedDB.open(DB_NAME, 1);

request.onupgradeneeded = function(e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = function(e) {
    db = e.target.result;
    loadProducts();
};

request.onerror = function() {
    alert("Gagal memuat database internal browser.");
};

// Format Rupiah
function formatRupiah(angka) {
    return "Rp " + Number(angka).toLocaleString('id-ID');
}

// Preview Gambar saat dipilih
function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function() {
        const preview = document.getElementById('form-preview');
        preview.src = reader.result;
        document.getElementById('preview-container').classList.remove('hidden');
    }
    if(event.target.files.length > 0) {
        reader.readAsDataURL(event.target.files[0]);
    }
}

// 2. Load & Tampilkan Produk beserta Deskripsi
function loadProducts() {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = function() {
        const products = getAllRequest.result;
        const tbody = document.getElementById("product-table-body");
        const emptyState = document.getElementById("empty-state");
        
        tbody.innerHTML = "";

        let totalProduk = products.length;
        let jumlahTerjual = 0;
        let totalPenjualan = 0;
        let totalLabaBersih = 0;

        if (totalProduk === 0) {
            emptyState.classList.remove("hidden");
        } else {
            emptyState.classList.add("hidden");
            products.forEach(prod => {
                const margin = prod.hargaJual - prod.hargaBeli;
                const labaBersih = margin * prod.terjual;
                const penjualan = prod.hargaJual * prod.terjual;

                jumlahTerjual += Number(prod.terjual);
                totalPenjualan += penjualan;
                totalLabaBersih += labaBersih;

                let imgSrc = "https://placeholder.com";
                if (prod.foto) {
                    imgSrc = prod.foto; // data url base64 string
                }

                const deskripsiSingkat = prod.deskripsi ? prod.deskripsi : "-";

                const row = `
                    <tr>
                        <td><img src="${imgSrc}" class="product-img"></td>
                        <td>
                            <span class="font-medium">${prod.nama}</span>
                            <span class="text-muted" title="${deskripsiSingkat}">${deskripsiSingkat}</span>
                        </td>
                        <td>${prod.kategori}</td>
                        <td>${formatRupiah(prod.hargaBeli)}</td>
                        <td class="font-medium">${formatRupiah(prod.hargaJual)}</td>
                        <td>${prod.stok}</td>
                        <td class="text-blue font-medium">${prod.terjual}</td>
                        <td>${formatRupiah(margin)}</td>
                        <td class="text-green font-semibold">${formatRupiah(labaBersih)}</td>
                        <td class="text-center">
                            <div class="action-spacer">
                                <button type="button" onclick="editProduct(${prod.id})" class="btn btn-xs btn-edit">Edit</button>
                                <button type="button" onclick="deleteProduct(${prod.id})" class="btn btn-xs btn-delete">Hapus</button>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }

        document.getElementById("stat-total-produk").innerText = totalProduk;
        document.getElementById("stat-jumlah-terjual").innerText = jumlahTerjual;
        document.getElementById("stat-total-penjualan").innerText = formatRupiah(totalPenjualan);
        document.getElementById("stat-laba-interal").innerText = formatRupiah(totalLabaBersih);
    };
}

// 3. Simpan / Update Produk ke Database Browser
function saveProduct(e) {
    e.preventDefault();
    
    const id = document.getElementById("form-id").value;
    const nama = document.getElementById("form-nama").value;
    const deskripsi = document.getElementById("form-deskripsi").value;
    const kategori = document.getElementById("form-kategori").value;
    const hargaBeli = Number(document.getElementById("form-harga-beli").value);
    const hargaJual = Number(document.getElementById("form-harga-jual").value);
    const stok = Number(document.getElementById("form-stok").value);
    const terjual = Number(document.getElementById("form-terjual").value);
    const fotoInput = document.getElementById("form-foto").files;

    const executeSave = (base64Foto) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const productData = { nama, deskripsi, kategori, hargaBeli, hargaJual, stok, terjual };

        if (id) {
            productData.id = Number(id);
            const getRequest = store.get(Number(id));
            
            getRequest.onsuccess = function() {
                productData.foto = base64Foto ? base64Foto : getRequest.result.foto;
                const updateRequest = store.put(productData);
                updateRequest.onsuccess = function() {
                    closeModal();
                    loadProducts();
                };
            };
        } else {
            productData.foto = base64Foto || null;
            const addRequest = store.add(productData);
            addRequest.onsuccess = function() {
                closeModal();
                loadProducts();
            };
        }
    };

    if (fotoInput.length > 0) {
        const reader = new FileReader();
        reader.onload = function() {
            executeSave(reader.result);
        };
        reader.readAsDataURL(fotoInput[0]);
    } else {
        executeSave(null);
    }
}

// 4. Isi Form saat Mengedit Data
function editProduct(id) {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = function() {
        const prod = request.result;
        document.getElementById("form-id").value = prod.id;
        document.getElementById("form-nama").value = prod.nama;
        document.getElementById("form-deskripsi").value = prod.deskripsi || "";
        document.getElementById("form-kategori").value = prod.kategori;
        document.getElementById("form-harga-beli").value = prod.hargaBeli;
        document.getElementById("form-harga-jual").value = prod.hargaJual;
        document.getElementById("form-stok").value = prod.stok;
        document.getElementById("form-terjual").value = prod.terjual;
        
        const previewImg = document.getElementById("form-preview");
        const previewContainer = document.getElementById("preview-container");
        if (prod.foto) {
            previewImg.src = prod.foto;
            previewContainer.classList.remove("hidden");
        } else {
            previewContainer.classList.add("hidden");
        }

        openModal("Edit Produk");
    };
}

// 5. Hapus Produk
function deleteProduct(id) {
    if (confirm("Apakah Anda yakin ingin menghapus produk pakaian ini?")) {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = function() {
            loadProducts();
        };
    }
}

// Pengendali Modal
function openModal(title = "Tambah Produk") {
    document.getElementById("modal-title").innerText = title;
    document.getElementById("product-modal").classList.add("active");
}

// Reset dan Tutup Modal
function closeModal() {
    document.getElementById("product-modal").classList.remove("active");
    document.getElementById("product-form").reset();
    document.getElementById("form-id").value = "";
    document.getElementById("preview-container").classList.add("hidden");
}
