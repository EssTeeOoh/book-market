-- Keep production storage behavior explicit and consistent with the upload form.
update storage.buckets
set public = true,
    file_size_limit = 10485760
where id = 'book-covers';

update storage.buckets
set public = false,
    file_size_limit = 20971520
where id = 'book-files';
