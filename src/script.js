const $postList = document.querySelector('[data-js="post-list"]');
const $savePost = document.querySelector('[data-js="save-post"]');
const $message = document.querySelector('[data-js="message"]');

const domain = 'https://www.tabnews.com.br';
const storageKey = '@TabnewsSavePost';

const savePostMessages = {
    'default': '<i class="fa-solid fa-plus"></i> Salvar post',
    'added': '<i class="fa-regular fa-bookmark"></i> Post salvo',
    'out': 'Você não está em um post',
};

function updateSavePost(key = 'default') {
    $savePost.innerHTML = savePostMessages[key];
}

function activeSavePostButton() {
    $savePost.classList.remove('disabled');
}

function desactiveSavePostButton() {
    $savePost.classList.add('disabled');
}

async function getPosts() {
    const valueFound = await chrome.storage.local.get(storageKey);
    const posts = Object.keys(valueFound).length === 0 ? [] : valueFound[storageKey];

    return posts;
}

async function persistPosts(posts) {
    await chrome.storage.local.set({ [storageKey]: posts });
}

async function handleRemove(slug) {
    const posts = await getPosts();

    const newPosts = posts.filter((post) => post.slug !== slug);

    await persistPosts(newPosts);

    activeSavePostButton();
    updateSavePost('default');
    renderPosts(newPosts);
}

function renderPost({ user, slug, title }) {
    $message.textContent = '';

    const $li = document.createElement('li');
    const $anchor = document.createElement('a');
    const $button = document.createElement('button');

    const url = `${domain}/${user}/${slug}`;

    $anchor.setAttribute('href', url);
    $anchor.setAttribute('target', '_blank');
    $anchor.textContent = title;

    $button.innerHTML = '<i class="fa-regular fa-x"></i>';
    $button.addEventListener('click', () => handleRemove(slug));

    $li.appendChild($anchor);
    $li.appendChild($button);

    $postList.appendChild($li);
}

function renderPosts(posts) {
    if (posts.length === 0) {
        $message.textContent = 'Você não poussuí posts salvos!';
    }

    $postList.innerHTML = '';

    posts.forEach(renderPost);
}

async function handleAddPost(post) {
    const posts = await getPosts();

    const alreadyInList = posts.some((innerPost) => innerPost.slug === post.slug);

    if (alreadyInList) {
        return;
    }

    await persistPosts([...posts, post]);

    updateSavePost('added');
    desactiveSavePostButton();
    renderPost(post);
}

async function main() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const posts = await getPosts();

    renderPosts(posts);

    const regex = /https:\/\/www.tabnews.com.br\/([A-Za-z0-9-_]+)\/([A-Za-z0-9-_]+)/;
    const isInTabnewsPost = regex.test(tab.url);

    if (!isInTabnewsPost) {
        updateSavePost('out');
        return;
    }

    const [title] = tab.title.split(' · ');
    const [_, user, slug] = regex.exec(tab.url);

    const postAlreadyAdded = posts.some((post) => post.slug === slug);

    const savePostKey = postAlreadyAdded ? 'added' : 'default';

    updateSavePost(savePostKey);

    if (!postAlreadyAdded) {
        activeSavePostButton();
    }

    $savePost.addEventListener('click', () => handleAddPost({
        user,
        slug,
        title
    }));
}

main();
