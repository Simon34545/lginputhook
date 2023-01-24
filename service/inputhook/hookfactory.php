<?php

use FFI\CData;

$fd2 = fopen("/tmp/hookfactory-" . $argv[1] . ".log", "a");
function logmsg2($str)
{
    global $fd2;
    fwrite($fd2, $str . "\n");
    // fflush($fd2);
    fsync($fd2);
}

logmsg2("hf");

class HookFactory2 {
	private static bool $initialized = false;

	private FFI $ffi;
	private CData $self;

	private CData $gum;

	/**
	 * @var HookHandle[]
	 */
	private array $handles = array();

	public function __construct($structs="") {
		logmsg2("HookFactory2");
		$this->ffi = FFI::cdef("
			void gum_init ();
			void *gum_interceptor_obtain();
			void gum_interceptor_begin_transaction(void *handle);
			int gum_interceptor_replace (void *handle,
				void *function_address,
				void *replacement_function,
				void *replacement_data,
				void **original_function);
			void gum_interceptor_end_transaction(void *handle);

			void *dlopen(const char *filename, int flag);
			void *dlsym(void *handle, const char *symbol);
		" . $structs);
		$this->self = $this->ffi->dlopen(NULL, 0x01);
		if($this->self == null){
			throw new \Exception("dlopen self failed");
		}

		if(!self::$initialized){
			$this->ffi->gum_init();
			self::$initialized = true;
		}
		$this->gum = $this->ffi->gum_interceptor_obtain();
	}

	/**
	 * converts a closure or an interger into a typed function pointer
	 */
	public function makePfn(string $type, $closure){
		$fnT = $this->ffi->type($type);
		$arrT = FFI::arrayType($fnT, [1]);
		$arr = FFI::new($arrT);
		$arr[0] = $closure;
		return $arr[0];
    }

    public function hasSymbol(string $funcName) {
        return $this->ffi->dlsym($this->self, $funcName) != null;
    }

	public function newHook(string $type, string $funcName, callable $hook){
		logmsg2("newHook");
		$pvCode = $this->ffi->dlsym($this->self, $funcName);
		logmsg2("pvCode1");
        if($pvCode == null){
            throw new Exception("Symbol $funcName does not exist");
		}
		logmsg2("pvCode2");

        $pfnOrig = $this->makePfn($type, $pvCode);
		logmsg2("pfnOrig");
        $handle = new HookHandle($this, $type, $pfnOrig, $hook);
		logmsg2("handle");

		$pvHook = $handle->getNativeHandle();
		logmsg2("pvHook");
		//var_dump($this->gum);
		//var_dump($pvCode);
		//var_dump($pvHook);
		$this->ffi->gum_interceptor_replace($this->gum,
			$pvCode, $pvHook, NULL, NULL);

		logmsg2("handle");
		$this->handles[] = $handle;
		logmsg2("done");
		return $handle;
	}
}

class HookFactory {
	private FFI $ffi;
	private CData $self;

	/**
	 * @var HookHandle[]
	 */
    private array $handles = array();

	public function __construct(){
		$this->ffi = FFI::cdef("
			void *inj_backup_function(void *original_code, size_t *num_saved_bytes, int opcode_bytes_to_restore);
			int inj_replace_function(void *original_fn, void *replacement_fn);

			void *dlopen(const char *filename, int flag);
			void *dlsym(void *handle, const char *symbol);
		");
		$this->self = $this->ffi->dlopen(NULL, 0x01);
		if($this->self == null){
			throw new \Exception("dlopen self failed");
		}
	}

	public static function makePfn(string $type, $closure){
		$fnT = FFI::type($type);
		$arrT = FFI::arrayType($fnT, [1]);
		$arr = FFI::new($arrT);
		$arr[0] = $closure;
		return $arr[0];
	}

	public function newHook(string $type, string $funcName, callable $hook){
		$pvCode = $this->ffi->dlsym($this->self, $funcName);
		if($pvCode == null){
			return null;
		}

		$pvOrig = $this->ffi->inj_backup_function($pvCode, NULL, -1);
		$pfnOrig = self::makePfn($type, $pvOrig);

		$handle = new HookHandle($type, $pfnOrig, $hook);
		$this->ffi->inj_replace_function($pvCode, $handle->getNativeHandle());

		$this->handles[] = $handle;
		return $handle;
	}
}

class HookHandle {
	private Closure $wrapCb;
	private Closure $hookCb;
	private CData $nat;

	public function __construct(HookFactory2 $parent, string $type, CData $pfnOrig, callable $hookCb){
		$this->wrapCb = Closure::fromCallable(function(...$args) use($pfnOrig, $hookCb){
			return $hookCb($pfnOrig, ...$args);
		});
		$this->nat = $parent->makePfn($type, $this->wrapCb);
	}

	public function getNativeHandle(){
		return $this->nat;
	}
}

print("Hello World\n");

/*$handle = $hf->newHook("int (*)(int, int)", "func1", function(callable $orig, int $arg1, int $arg2){
	$orig(0, 1);
	return 1234;
});*/
