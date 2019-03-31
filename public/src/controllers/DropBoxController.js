class DropBoxController {
    constructor(){
        this.currentFolder = ['hcode'];

        this.onselectionchange = new Event('selectionchange');

        this.btnSendFileEl = document.querySelector('#btn-send-file');
        this.inputFilesEl = document.querySelector('#files');
        this.snackModalEl = document.querySelector('#react-snackbar-root');
        this.progressBarEl = this.snackModalEl.querySelector('.mc-progress-bar-fg');
        this.nameFileEl = this.snackModalEl.querySelector('.filename');
        this.timeleftEl = this.snackModalEl.querySelector('.timeleft');
        this.listFilesEl = document.querySelector('#list-of-files-and-directories');
        this.btnNewFolderEl = document.querySelector('#btn-new-folder');
        this.btnRenameEl = document.querySelector('#btn-rename');
        this.btnNewDeleteEl = document.querySelector('#btn-delete');
        this.btnNewDeleteEl.style.display = 'none';
        this.btnRenameEl.style.display = 'none';
        this.navEl = document.querySelector('#browse-location');

        this.connectFirebase();
        this.initEvents();

        this.openFolder();
        

        
    }

    ajax(){

    }

    connectFirebase(){
       
        // Initialize Firebase
        var config = {
            apiKey: "",
            authDomain: "",
            databaseURL: "",
            projectId: "",
            storageBucket: "",
            messagingSenderId: ""
          };
        firebase.initializeApp(config);
       
    }

    getFirebaseRef(path = this.currentFolder.join('/')){
        
        return firebase.database().ref(path);
    }

    getSelection(){
        return this.listFilesEl.querySelectorAll('.selected');
    }

    removeFile(ref, name){
        let fileRef = firebase.storage().ref(ref).child(name);

        return fileRef.delete();
    }

    removeFolderTask(ref,name){
        return new Promise((resolve,reject) =>{
            let folderRef = this.getFirebaseRef(ref+'/'+name);

            folderRef.on('value',snapshot =>{
                snapshot.forEach(item =>{
                    let data = item.val();
                    data.key = item.key;

                    if(data.type === 'folder'){

                        this.removeFolderTask(ref+'/'+name, data.name)
                        .then(()=>{
                            this.getFirebaseRef().child(data.key).set(null);
                            resolve('arquivo deleteado')
                        })
                        .catch((err)=> {
                            reject(err);
                        });
                    }else if(data.type){
                        this.removeFile(ref+'/'+name,data.name)
                        .then(() =>{
                            this.getFirebaseRef().child(data.key).set(null);
                            resolve('arquivo deletado');
                        })
                        .catch(err =>{
                            reject(err)
                        });
                    }
                });
            });

            folderRef.remove();
            folderRef.off('value');
        });
    }

    removeTaks(){
        let promises = [];

        this.getSelection().forEach(li =>{
            let file = JSON.parse(li.dataset.file);

           // let name = file.path.split('/')[1]
            
            promises.push(new Promise((resolve,reject)=>{

                if(file.type === 'folder'){
                    this.removeFolderTask(this.currentFolder.join('/'),file.name)
                    .then(() =>{
                        this.getFirebaseRef().child(li.dataset.key).set(null);
                        resolve('arquivo deletado');
                    })
                    .catch(err =>{
                        reject(err)
                    });
                }else if(file.type){
                    this.removeFile(this.currentFolder.join('/'),file.name)
                    .then(() =>{
                        this.getFirebaseRef().child(li.dataset.key).set(null);
                        resolve('arquivo deletado');
                    })
                    .catch(err =>{
                        reject(err)
                    });
                }
            }));
            /*upload local
            promises.push(new Promise((resolve,reject)=>{

                const ajax = new XMLHttpRequest();
                
                ajax.open('DELETE','/'+name);

                ajax.onload = e =>{
                    try {
                        this.getFirebaseRef().child(li.dataset.key).set(null);
                        resolve(li.dataset.key));
                    } catch (error) {
                        reject(error);
                    }
                    
                };
                ajax.onerror = e =>{
                    reject(e)
                };


                ajax.send();

            }));*/
        });

        return Promise.all(promises);
    }

    initEvents(){

        this.btnNewFolderEl.addEventListener('click', e => {
            let name = prompt('Nome da pasta: ');

            if(name){
                this.getFirebaseRef().push().set({
                    name,
                    type: 'folder',
                    path: this.currentFolder.join('/')
                });
            }
        });

        this.btnNewDeleteEl.addEventListener('click', e =>{
            this.removeTaks()
            .then(res =>{
                log('arquivo apagado')
            }).catch(err =>{
                log(err)
            });
        });

        this.btnRenameEl.addEventListener('click', e =>{
            let li = this.getSelection()[0];

            let file = JSON.parse(li.dataset.file);

            let name = prompt('Digite o nome:', file.name);

            if(name){
                file.name = name;
                this.getFirebaseRef().child(li.dataset.key).set(file);
            }
        });

        this.listFilesEl.addEventListener('selectionchange',e =>{

            switch (this.getSelection().length) {
                case 0:
                    this.btnNewDeleteEl.style.display = 'none';
                    this.btnRenameEl.style.display = 'none';
                    break;
                case 1:
                    this.btnNewDeleteEl.style.display = 'block';
                    this.btnRenameEl.style.display = 'block';
                    break;
            
                default:
                    this.btnNewDeleteEl.style.display = 'block';
                    this.btnRenameEl.style.display = 'none';
                    break;
            }

        });

        this.btnSendFileEl.addEventListener('click', e =>{
                this.inputFilesEl.click();
        });

        this.inputFilesEl.addEventListener('change', e => {
                this.btnSendFileEl.disabled = false;

                this.uploadTask(e.target.files)
                .then(res =>{

                    res.forEach(item =>{
                        const file = {
                            name: item.name,
                            type: item.contentType,
                            path: item.fullPath,
                            size: item.size
                        };
                        this.getFirebaseRef().push().set(file);
                        log(item)
                    });

                    //upload local
                    /*
                    res.forEach(item =>{
                        const file = item.files['input-file'];
                        this.getFirebaseRef().push().set(file);
                        log(file)
                    });*/

                    this.uploadComplete();
                })
                .catch(err =>{
                    log(err);
                    this.uploadComplete();
                });

            
                this.modalShow();
                
        });

    }

    modalShow(show = true){
        this.snackModalEl.style.display = (show) ? 'block' : 'none';
    }

    uploadComplete(){
        this.modalShow(false);
        this.inputFilesEl.value = '';
        this.btnSendFileEl.disabled = false;
    }

    uploadTask(files){
        let promises = [];

        [...files].forEach(file => {
            promises.push(new Promise((resolve,reject) => {
                let fileRef = firebase.storage().ref(this.currentFolder.join('/')).child(file.name);

                let task = fileRef.put(file);
                this.startUploadTime = Date.now();
                task.on('state_changed',snapshot =>{
                    this.uploadProgress({
                        loaded:snapshot.bytesTransferred,
                        total: snapshot.totalBytes
                    },file);
                },error => {
                    log(error)
                    reject(error)
                },() =>{
                    fileRef.getMetadata()
                    .then(data =>{
                        resolve(data)
                    })
                    .catch(err =>{
                        reject(err);
                    });
                    
                });
            }));

            //upload local
            /*
            promises.push(new Promise((resolve,reject) => {
                const ajax = new XMLHttpRequest();
                
                ajax.open('POST','/upload');

                ajax.onload = e =>{
                    try {
                        resolve(JSON.parse(ajax.responseText));
                    } catch (error) {
                        reject(error);
                    }

                    
                };

                ajax.onerror = e =>{
                    reject(e)
                };

                ajax.upload.onprogress = e =>{
                   this.uploadProgress(e,file);
                };

                //coloca nome do arquinvo na barra
                this.nameFileEl.innerHTML = file.name;

                let formData = new FormData();

                formData.append('input-file',file);

                this.startUploadTime = Date.now();

                ajax.send(formData);

            }));*/
        });

        return Promise.all(promises);
    }

    uploadProgress({loaded,total}, file){

        let porcent = parseInt((loaded/total)*100);
        //barra
        this.progressBarEl.style.width = porcent+'%';
        //tempo

        let timespent = Date.now()-this.startUploadTime;
        let timeleft = (100-porcent) *timespent / porcent;


        this.timeleftEl.innerHTML = this.formatTimeToHuman(timeleft);
    }

    formatTimeToHuman(duration){
        let seconds = parseInt((duration/1000) % 60);
        let minutes = parseInt((duration/(1000*60)) % 60);
        let hours = parseInt((duration/(1000*60+60)) % 24);

        if(hours > 0){
            return `${hours} horas, ${minutes} minutos e ${seconds} segundos`;
        }else if(minutes > 0){
            return `${minutes} minutos e ${seconds} segundos`;
        }

        return `${seconds} segundos`;
    }

    getfileIconView(file){
        switch (file.type) {
            case 'folder':
                return `
                <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                    <title>content-folder-large</title>
                    <g fill="none" fill-rule="evenodd">
                        <path d="M77.955 53h50.04A3.002 3.002 0 0 1 131 56.007v58.988a4.008 4.008 0 0 1-4.003 4.005H39.003A4.002 4.002 0 0 1 35 114.995V45.99c0-2.206 1.79-3.99 3.997-3.99h26.002c1.666 0 3.667 1.166 4.49 2.605l3.341 5.848s1.281 2.544 5.12 2.544l.005.003z"
                            fill="#71B9F4"></path>
                        <path d="M77.955 52h50.04A3.002 3.002 0 0 1 131 55.007v58.988a4.008 4.008 0 0 1-4.003 4.005H39.003A4.002 4.002 0 0 1 35 113.995V44.99c0-2.206 1.79-3.99 3.997-3.99h26.002c1.666 0 3.667 1.166 4.49 2.605l3.341 5.848s1.281 2.544 5.12 2.544l.005.003z"
                            fill="#92CEFF"></path>
                    </g>
                </svg>`;
                break;
            case 'image/jpeg':
            case 'image/jpg':
            case 'image/png':
            case 'image/gif':
                return `
                <svg version="1.1" id="Camada_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                    width="160px" height="160px" viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve">
                    <filter height="102%" width="101.4%" id="mc-content-unknown-large-a" filterUnits="objectBoundingBox" y="-.5%" x="-.7%">
                        <feOffset result="shadowOffsetOuter1" in="SourceAlpha" dy="1"></feOffset>
                        <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1">
                        </feColorMatrix>
                    </filter>
                    <title>Imagem</title>
                    <g>
                        <g>
                            <g filter="url(#mc-content-unknown-large-a)">
                                <path id="mc-content-unknown-large-b_2_" d="M47,30h66c2.209,0,4,1.791,4,4v92c0,2.209-1.791,4-4,4H47c-2.209,0-4-1.791-4-4V34
                                        C43,31.791,44.791,30,47,30z" />
                            </g>
                            <g>
                                <path id="mc-content-unknown-large-b_1_" fill="#F7F9FA" d="M47,30h66c2.209,0,4,1.791,4,4v92c0,2.209-1.791,4-4,4H47
                                        c-2.209,0-4-1.791-4-4V34C43,31.791,44.791,30,47,30z" />
                            </g>
                        </g>
                    </g>
                    <g>
                        <path fill-rule="evenodd" clip-rule="evenodd" fill="#848484" d="M81.148,62.638c8.086,0,16.173-0.001,24.259,0.001
                                c1.792,0,2.3,0.503,2.301,2.28c0.001,11.414,0.001,22.829,0,34.243c0,1.775-0.53,2.32-2.289,2.32
                                c-16.209,0.003-32.417,0.003-48.626,0c-1.775,0-2.317-0.542-2.318-2.306c-0.002-11.414-0.003-22.829,0-34.243
                                c0-1.769,0.532-2.294,2.306-2.294C64.903,62.637,73.026,62.638,81.148,62.638z M81.115,97.911c7.337,0,14.673-0.016,22.009,0.021
                                c0.856,0.005,1.045-0.238,1.042-1.062c-0.028-9.877-0.03-19.754,0.002-29.63c0.003-0.9-0.257-1.114-1.134-1.112
                                c-14.637,0.027-29.273,0.025-43.91,0.003c-0.801-0.001-1.09,0.141-1.086,1.033c0.036,9.913,0.036,19.826,0,29.738
                                c-0.003,0.878,0.268,1.03,1.069,1.027C66.443,97.898,73.779,97.911,81.115,97.911z" />
                        <path fill-rule="evenodd" clip-rule="evenodd" fill="#848484" d="M77.737,85.036c3.505-2.455,7.213-4.083,11.161-5.165
                                c4.144-1.135,8.364-1.504,12.651-1.116c0.64,0.058,0.835,0.257,0.831,0.902c-0.024,5.191-0.024,10.381,0.001,15.572
                                c0.003,0.631-0.206,0.76-0.789,0.756c-3.688-0.024-7.375-0.009-11.062-0.018c-0.33-0.001-0.67,0.106-0.918-0.33
                                c-2.487-4.379-6.362-7.275-10.562-9.819C78.656,85.579,78.257,85.345,77.737,85.036z" />
                        <path fill-rule="evenodd" clip-rule="evenodd" fill="#848484" d="M87.313,95.973c-0.538,0-0.815,0-1.094,0
                                c-8.477,0-16.953-0.012-25.43,0.021c-0.794,0.003-1.01-0.176-0.998-0.988c0.051-3.396,0.026-6.795,0.017-10.193
                                c-0.001-0.497-0.042-0.847,0.693-0.839c6.389,0.065,12.483,1.296,18.093,4.476C81.915,90.33,84.829,92.695,87.313,95.973z"
                        />
                        <path fill-rule="evenodd" clip-rule="evenodd" fill="#848484" d="M74.188,76.557c0.01,2.266-1.932,4.223-4.221,4.255
                                c-2.309,0.033-4.344-1.984-4.313-4.276c0.03-2.263,2.016-4.213,4.281-4.206C72.207,72.338,74.179,74.298,74.188,76.557z"
                        />
                    </g>
                </svg>
                `;
                break;
        
            default:
                return `
                <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                    <title>1357054_617b.jpg</title>
                    <defs>
                        <rect id="mc-content-unknown-large-b" x="43" y="30" width="74" height="100" rx="4"></rect>
                        <filter x="-.7%" y="-.5%" width="101.4%" height="102%" filterUnits="objectBoundingBox" id="mc-content-unknown-large-a">
                            <feOffset dy="1" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
                            <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1"></feColorMatrix>
                        </filter>
                    </defs>
                    <g fill="none" fill-rule="evenodd">
                        <g>
                            <use fill="#000" filter="url(#mc-content-unknown-large-a)" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-unknown-large-b"></use>
                            <use fill="#F7F9FA" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-unknown-large-b"></use>
                        </g>
                    </g>
                </svg>
                `;
                break;
        }

    }

    getFileView(file,key){
        let li = document.createElement('li');
        li.dataset.key = key;
        li.dataset.file = JSON.stringify(file);
        li.innerHTML = `${this.getfileIconView(file)}
        <div class="name text-center">${file.name}</div>
        `;

        this.initEventsLi(li);

        return li;
    }

    openFolder(){

        if(this.lastFolder){
            this.getFirebaseRef(this.lastFolder).off('value');
        }
        this.renderNav();
        this.redFiles();
    }

    renderNav(){
        let nav = document.createElement('nav');
        let path = [];

        for (let i = 0; i < this.currentFolder.length; i++) {
            const folderName = this.currentFolder[i];
            let span = document.createElement('span');

            path.push(folderName);

            if((i+1) === this.currentFolder.length){
                span.innerHTML = folderName;
            }else{
                span.className = 'breadcrumb-segment__wrapper';
                span.innerHTML = `
                <span class="ue-effect-container uee-BreadCrumbSegment-link-0">
                    <a href="#" data-path="${path.join('/')}" class="breadcrumb-segment">${folderName}</a>
                </span>
                <svg width="24" height="24" viewBox="0 0 24 24" class="mc-icon-template-stateless" style="top: 4px; position: relative;">
                    <title>arrow-right</title>
                    <path d="M10.414 7.05l4.95 4.95-4.95 4.95L9 15.534 12.536 12 9 8.464z" fill="#637282"
                        fill-rule="evenodd"></path>
                </svg>
                `;
                
            }
            
            nav.appendChild(span);
        }
        
        this.navEl.innerHTML = nav.innerHTML;

        this.navEl.querySelectorAll('a').forEach(a =>{
            a.addEventListener('click', e =>{
                e.preventDefault();

                this.currentFolder = a.dataset.path.split('/');

                this.openFolder();
            });
        }); 
    }

    initEventsLi(li){
        li.addEventListener('dblclick', e =>{
            let file = JSON.parse(li.dataset.file);

            if(file.type == 'folder'){
                this.currentFolder.push(file.name);

                this.openFolder();
            }else{
                window.open('/file?path='+file.path)
            }
        });

        li.addEventListener('click', e =>{
            if(e.shiftKey){
                let firstLi = this.listFilesEl.querySelector('.selected');

                if(firstLi){
                    let indexStart;
                    let indexEnd;
                    const lis = li.parentElement.childNodes;


                    lis.forEach((el,index) => {

                        if(firstLi === el) indexStart = index;
                        if(li === el) indexEnd = index;

                    });

                    const indexs = [indexStart,indexEnd].sort();

                    lis.forEach((el,index) => {

                        if(index >= indexs[0] && index <= indexs[1]){
                            el.classList.add('selected');
                        }

                    });

                    this.listFilesEl.dispatchEvent(this.onselectionchange);

                    return;
                }
                
            }
        
            if(!e.ctrlKey){
                this.listFilesEl.querySelectorAll('li.selected').forEach(el =>{
                    if(el == li){
                        return;
                    }
                    el.classList.remove('selected');
                });
            }
            
            li.classList.toggle('selected');
           

            this.listFilesEl.dispatchEvent(this.onselectionchange);
        });
    }

    redFiles(){
        this.lastFolder = this.currentFolder.join('/');

        this.getFirebaseRef().on('value',snapshot =>{

            this.listFilesEl.innerHTML = '';

            snapshot.forEach(item =>{

                const data = item.val();

                if(!data.type){
                    return;
                }

                this.listFilesEl.appendChild(this.getFileView(data,item.key));
            });
        }); 
    }
}